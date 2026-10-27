using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using PostCodeSerialMonitor.Models;
using PostCodeSerialMonitor.Services;
using Xunit;

namespace PostCodeSerialMonitor.Tests;

public class TestSerialPort : ISerialPort
{
    private readonly Queue<char> _readQueue = new();
    public List<string> WrittenData { get; } = new();
    public bool IsOpen { get; set; } = true;
    public int BytesToRead => _readQueue.Count;

    public void Feed(string text)
    {
        foreach (var c in text)
            _readQueue.Enqueue(c);
    }

    public void Open() => IsOpen = true;
    public void Close() => IsOpen = false;

    public void Write(string text)
    {
        WrittenData.Add(text);
    }

    public void WriteLine(string text)
    {
        WrittenData.Add(text + "\r\n");
        if (text == "\x03" || text == "")
        {
            Feed(">> ");
        }
        else if (text == "version")
        {
            Feed("FW: v0.4.1 20260730\r\n>> ");
        }
        else if (text == "config")
        {
            Feed("Notice: Showing config\r\nDisplay mirrored:       ON\r\nDisp rotation portrait: OFF\r\nPrint timestamps:       ON\r\nPrint colors:           ON\r\n>> ");
        }
    }

    public char ReadChar() => _readQueue.Count > 0 ? _readQueue.Dequeue() : '\0';
    public string ReadLine() => "";
    public void Dispose() => Close();
}

public class SerialServiceTests
{
    [Fact]
    public async Task Connect_ShouldSendResetSequenceAndParseVersionAndConfig()
    {
        var logger = new Mock<ILogger<SerialService>>();
        var service = new SerialService(logger.Object);
        var testPort = new TestSerialPort();
        service.PortFactory = (name, baud) => testPort;

        await service.ConnectAsync("COM1");

        Assert.Equal("v0.4.1", service.FirmwareVersion);
        Assert.Equal("20260730", service.BuildDate);
        Assert.True(service.MirrorDisplay);
        Assert.False(service.PortraitMode);
        Assert.True(service.PrintTimestamps);
        Assert.Contains(testPort.WrittenData, x => x.Contains("version"));
        Assert.Contains(testPort.WrittenData, x => x.Contains("config"));
        Assert.Contains(testPort.WrittenData, x => x.Contains("post"));

        service.Disconnect();
        Assert.False(service.IsOpen);
    }

    [Fact]
    public async Task Connect_ShouldThrowWhenFirmwareVersionTooOld()
    {
        var logger = new Mock<ILogger<SerialService>>();
        var service = new SerialService(logger.Object);
        var testPort = new TestSerialPort();
        service.PortFactory = (name, baud) => testPort;

        testPort.WrittenData.Clear();
        // Override behavior by feeding old version
        var oldPort = new Mock<ISerialPort>();
        var readQueue = new Queue<char>();
        void EnqueueText(string t) { foreach (var c in t) readQueue.Enqueue(c); }
        oldPort.SetupGet(p => p.IsOpen).Returns(true);
        oldPort.SetupGet(p => p.BytesToRead).Returns(() => readQueue.Count);
        oldPort.Setup(p => p.ReadChar()).Returns(() => readQueue.Count > 0 ? readQueue.Dequeue() : '\0');
        oldPort.Setup(p => p.WriteLine(It.IsAny<string>())).Callback<string>(s =>
        {
            if (s == "\x03" || s == "") EnqueueText(">> ");
            else if (s == "version") EnqueueText("FW: v0.2.1 20240521\r\n>> ");
        });

        service.PortFactory = (name, baud) => oldPort.Object;

        await Assert.ThrowsAsync<Exception>(() => service.ConnectAsync("COM1"));
    }
}

public class SerialServiceDisconnectTests
{
    [Fact]
    public async Task Disconnect_WhileReadLoopIsBlockedOnRead_FiresDisconnectedExactlyOnce()
    {
        // Arrange
        var logger = new Mock<ILogger<SerialService>>();
        var service = new SerialService(logger.Object);

        var readerBlocked = new ManualResetEventSlim(false);   // ReadLoop has entered ReadChar()
        var releaseReader = new ManualResetEventSlim(false);   // Close() happened, ReadChar() may throw

        var mockPort = new Mock<ISerialPort>();
        mockPort.SetupGet(p => p.IsOpen).Returns(true);
        mockPort.Setup(p => p.ReadChar()).Returns(() =>
        {
            readerBlocked.Set();
            releaseReader.Wait(TimeSpan.FromSeconds(5));
            throw new IOException("Port closed while a read was pending");
        });
        mockPort.Setup(p => p.Close()).Callback(() => releaseReader.Set());

        service._serialPort = mockPort.Object;
        service._readCts = new CancellationTokenSource();

        var disconnectedCount = 0;
        service.Disconnected += () => Interlocked.Increment(ref disconnectedCount);

        var readLoopTask = Task.Run(() => service.ReadLoop(service._readCts.Token));

        Assert.True(readerBlocked.Wait(TimeSpan.FromSeconds(2)), "ReadLoop never reached ReadChar()");

        // Act
        service.Disconnect();

        await readLoopTask;

        // Assert
        Assert.Equal(1, disconnectedCount);
    }
}
