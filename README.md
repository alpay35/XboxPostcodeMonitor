[![Build and Release](https://github.com/alpay35/XboxPostcodeMonitor/actions/workflows/build.yml/badge.svg)](https://github.com/alpay35/XboxPostcodeMonitor/actions/workflows/build.yml)
[![GitHub Downloads](https://img.shields.io/github/downloads/alpay35/XboxPostcodeMonitor/total)](https://github.com/alpay35/XboxPostcodeMonitor/releases)
[![Latest Release](https://img.shields.io/github/v/release/alpay35/XboxPostcodeMonitor)](https://github.com/alpay35/XboxPostcodeMonitor/releases/latest)

# Xbox PostCode Serial Monitor

**Xbox PostCode Serial Monitor**, Avalonia .NET 9 ile geliştirilmiş; Xbox One (Phat, S, X) ve Xbox Series (S, X) konsol onarımlarında anakart üzerindeki UART/POST hatlarından gelen durum ve hata kodlarını [PicoDurangoPOST](https://github.com/xboxoneresearch/PicoDurangoPOST) (Raspberry Pi Pico / Pico 2 / ESP32) donanımı üzerinden canlı dinleyen, çözümleyen ve görselleştiren çapraz platform (Windows, Linux, macOS) masaüstü uygulamasıdır.

Hata tanımları ve POST kodları [errors.xboxresearch.com](https://errors.xboxresearch.com) veritabanı ile otomatik senkronize edilir.

> [!IMPORTANT]
> Bu aracı kullanabilmek için Raspberry Pi Pico üzerinde en az **v0.4.0** veya daha yeni bir `PicoDurangoPOST` firmware sürümü yüklü olmalıdır.

---

## 🌐 Tarayıcı Sürümü (Web Serial Monitor - Kurulumsuz)

Herhangi bir kurulum yapmadan, doğrudan **Google Chrome**, **Microsoft Edge**, **Opera** veya **Brave** tarayıcınızdan Xbox POST kodlarını anlık izleyebilirsiniz!

- 🔗 **Canlı Web Uygulaması**: [https://alpay35.github.io/XboxPostcodeMonitor/](https://alpay35.github.io/XboxPostcodeMonitor/)
- **Özellikler**:
  - Web Serial API ile doğrudan USB/UART COM port bağlantısı.
  - Sürücü veya .NET runtime kurulumu gerektirmez.
  - Windows, macOS, Linux, Chromebook ve Android (USB OTG) destekler.
  - Kod arama, filtreleme, çevrimdışı çalışma, otomatik metadata güncelleme ve .log dışa aktarma.
  - Bağımsız (Standalone) Manuel Kod Çözümleme aracı.

---

## 🚀 Temel Özellikler

- **Gerçek Zamanlı Seri Port İzleme**: SMC, SP, CPU ve OS kodlarını anında ekranda listeler ve renklendirir (Bilgi, Uyarı, Hata).
- **Akıllı Kod Çözümleme**:
  - *Tam Kod Eşleşmesi (Distinct Code)*: Birebir tanımlı kodları çözümler.
  - *Bitmask Ayrıştırması (Bitmask Decomposition)*: Çoklu bayrak içeren hata kodlarını bit düzeyinde ayrıştırır (MSB -> LSB).
  - *Genel Hata Maskeleri (Error Masks)* ve *İşletim Sistemi Hataları (OSErrors)*.
- **Canlı Arama ve Kategori Filtresi**:
  - Arama kutusu ile Hex kod, isim veya açıklama içinde anlık filtreleme.
  - `Tümü`, `Sadece Hatalar`, `Uyarı ve Hatalar`, `SMC`, `SP`, `CPU`, `OS` kategorilerine göre tek tıkla filtreleme.
- **Otomatik Yeniden Bağlanma (Auto-Reconnect)**: Konsol açılıp kapandığında veya USB hattı resetlendiğinde aygıtı otomatik algılayıp yeniden bağlanır.
- **Tam Türkçe & Çok Dilli Arayüz**: Türkçe (`tr-TR` / `tr`), İngilizce (`en-US`) ve Brezilya Portekizcesi (`pt-BR`) dil desteği.
- **Otomatik Metadata Güncelleme**: Uygulama açılışında yeni POST/hata kodları web üzerinden denetlenir ve tek tıkla güncellenir. Pico'yu yeniden flashlamaya gerek kalmaz.
- **Kapsamlı Log Kaydı**: Ham seri verisini, çözümlenmiş kodları, donanım ve firmware bilgilerini içeren `.log` raporu oluşturur.
- **Farklı Görünüm Seçenekleri**: Satır İçi (Inline), Yeni Satır (New Line) veya Alt Panel (Bottom Panel) modları.

---

## 🛠️ Bu Sürümde Yapılan İyileştirmeler ve Düzeltmeler

Bu sürümde kod tabanı kapsamlı şekilde optimize edilmiş ve yeni özellikler eklenmiştir:

1. **Arayüz Thread Güvenliği (Dispatcher Entegrasyonu)**:
   - Seri port okuma döngüsünün arka plan thread'inde ürettiği olaylar (`DataReceived`, `Disconnected` vb.) Avalonia UI ana iş parçacığına (`Dispatcher.UIThread`) bağlandı.
   - Hızlı veri akışlarında veya ani bağlantı kopmalarında oluşabilecek donma ve çakışmalar giderildi.
2. **`OSErrors` Desteği**:
   - `MetaDefinitionService` tarafından indirilen OS hata tanımları kod çözücü motoruna (`SerialLineDecoder`) entegre edildi.
3. **Kritik `.First()` Çökme Riski Giderildi**:
   - Kod çözümlemesinde boş konsol kuralı dizilerinde oluşan `InvalidOperationException` hatası giderildi, `Contains(ConsoleType.ALL)` yapısına geçildi.
4. **Seri Port Zamanlaması & Bloklayıcı `Thread.Sleep` İyileştirildi**:
   - Bloklayıcı `Thread.Sleep(100)` çağrıları asenkron `Task.Delay` ile değiştirildi; veri tamponu için dinamik zaman aşımı mekanizması eklendi.
5. **Kapsamlı Birim Testleri**:
   - `TestSerialPort` simülatörü geliştirilerek devre dışı bırakılmış tüm testler aktif edildi ve test sayısı 68'e çıkarıldı (%100 başarılı).
6. **Türkçe Dil Paketi (`Resources.tr-TR.resx`)**:
   - Tüm arayüz ve bildirimler eksiksiz Türkçeleştirildi; varsayılan dil Türkçe yapıldı.

---

## 📸 Ekran Görüntüsü

![Xbox PostCode Serial Monitor Ekran Görüntüsü](./assets/gui_screenshot.png)

---

## 💻 Kullanım

1. [Releases](https://github.com/alpay35/XboxPostcodeMonitor/releases) sayfasından işletim sisteminize uygun paketi indirin.
2. `PicoDurangoPOST` bağlı Raspberry Pi Pico'yu bilgisayarınıza takın.
3. Uygulamayı başlatın:
   - Port açılır kutusundan ilgili **COM portunu** seçin.
   - Konsol modelinizi belirleyin (Örn: `XboxOnePhat`, `XboxOneS`, `XboxOneX`, `XboxSeriesS`, `XboxSeriesX`).
   - İsteğe bağlı olarak **Otomatik Yeniden Bağlan** seçeneğini işaretleyin.
   - **Bağlan (Connect)** butonuna tıklayın.
4. Konsolu açtığınızda POST kodları anlık olarak listelenecektir.

---

## 🔧 Geliştirme ve Derleme

### Gereksinimler
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0) veya üzeri

### Projeyi Çalıştırma
```sh
# Depoyu klonlayın
git clone https://github.com/alpay35/XboxPostcodeMonitor.git
cd XboxPostcodeMonitor

# Bağımlılıkları geri yükleyin ve çalıştırın
dotnet run --project PostCodeSerialMonitor
```

### Testleri Çalıştırma
```sh
dotnet test
```

### Dağıtım Paketi Oluşturma (Self-Contained)
```sh
dotnet publish PostCodeSerialMonitor -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```

---

## 🤝 Teşekkür & Referanslar

- [XboxResearch](https://xboxresearch.com) & [errors.xboxresearch.com](https://errors.xboxresearch.com) - POST kodları ve hata veritabanı için.
- [PicoDurangoPOST](https://github.com/xboxoneresearch/PicoDurangoPOST) - Raspberry Pi Pico firmware projesi.
- [Avalonia UI](https://avaloniaui.net/) - Çapraz platform masaüstü kullanıcı arayüzü çatısı.
