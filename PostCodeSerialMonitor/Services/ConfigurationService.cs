using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using PostCodeSerialMonitor.Models;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;

namespace PostCodeSerialMonitor.Services;
public class ConfigurationService
{
    private const int SUPPORTED_FORMAT_VERSION = 2;
    private readonly string _configFilePath;
    private readonly IOptionsMonitor<AppConfiguration> _configurationMonitor;
    private readonly ILogger<ConfigurationService> _logger;

    public AppConfiguration Config => _configurationMonitor.CurrentValue;

    public ConfigurationService(
        IOptionsMonitor<AppConfiguration> configurationMonitor,
        ILogger<ConfigurationService> logger,
        string configFilePath = "config.json")
    {
        _configurationMonitor = configurationMonitor;
        _logger = logger;
        _configFilePath = configFilePath;
    }

    public async Task SaveConfigurationAsync()
    {
        try
        {
            var startupPath = AppContext.BaseDirectory?.TrimEnd(Path.DirectorySeparatorChar)
                ?? throw new InvalidOperationException();

            var newConfig = new Dictionary<string, AppConfiguration>(){
                { nameof(AppConfiguration), _configurationMonitor.CurrentValue }
            };
            var json = JsonSerializer.Serialize(newConfig, new JsonSerializerOptions
            {
                WriteIndented = true
            });

            await File.WriteAllTextAsync(Path.Join(startupPath, _configFilePath), json);
            _logger.LogInformation(Assets.Resources.ConfigurationSaved);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, Assets.Resources.FailedSaveConfiguration);
            throw;
        }
    }

    public async Task UpdateConfigurationAsync(Action<AppConfiguration> updateAction)
    {
        try
        {
            var config = _configurationMonitor.CurrentValue;
            updateAction(config);
            await SaveConfigurationAsync();
            _logger.LogInformation(Assets.Resources.ConfigurationUpdated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, Assets.Resources.FailedUpdateConfiguration);
            throw;
        }
    }
}