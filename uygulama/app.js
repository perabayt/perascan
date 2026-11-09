/* PeraScan tanıtım arayüzü.
 * Görünüm ve akış uygulamanın WPF görünümlerinden (MainWindow, DashboardView, ConsentWindow,
 * ElevationWindow, ScanView, SectionView) ve SectionBuilder.cs'ten aktarıldı. Etiketler
 * uygulamadakiyle aynı: gezinti ve akış Türkçe (Strings.tr.resx), ayrıntı tablolarının
 * başlıkları uygulamada olduğu gibi İngilizce. Veriler örnektir (veri.json); hiçbir sistem
 * bilgisi okunmaz, tarama canlandırmadır.
 */
(function () {
  "use strict";

  // Tanıtım sayfasına gömülüyken (iframe) odak, dış sayfayı kaydırmasın ve
  // ziyaretçi çerçeveye dokunmadan klavye odağını çalmasın (telefonda klavye açılmasın).
  if (window.top !== window.self) {
    var _odak = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (o) {
      if (!document.hasFocus()) return;
      return _odak.call(this, Object.assign({ preventScroll: true }, o || {}));
    };
  }

  var $ = function (s, k) { return (k || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var tr = new Intl.NumberFormat("tr-TR");
  var YOK = "—";

  var SAYFALAR = [
    ["Dashboard", "Kontrol Paneli", false], ["Scan", "Tarama", false], ["Hardware", "Donanım", true],
    ["Software", "Yazılım", true], ["Network", "Ağ", true], ["Security", "Güvenlik", true],
    ["Storage", "Depolama", true], ["Processes", "Süreçler", true], ["Events", "Olaylar", true],
    ["Files", "Dosyalar", true], ["Report", "Rapor", true], ["Settings", "Ayarlar", false], ["Privacy", "Gizlilik", false],
  ];
  var KATEGORILER = [
    ["Hardware", "Donanım"], ["OperatingSystem", "İşletim Sistemi"], ["Software", "Yazılım"], ["Storage", "Depolama"],
    ["Network", "Ağ"], ["Security", "Güvenlik"], ["Users", "Kullanıcılar"], ["Processes", "Çalışan Süreçler"],
    ["Services", "Windows Hizmetleri"], ["Startup", "Başlangıç Öğeleri"], ["ScheduledTasks", "Zamanlanmış Görevler"],
    ["EventLogs", "Olay Günlükleri"], ["FileSystem", "Seçilen Dosya Sistemi"], ["Performance", "Performans"],
  ];
  var YUKSELTME = { Security: 1, Processes: 1, ScheduledTasks: 1, EventLogs: 1, Users: 1 };
  // Toplayıcıların ilerleme cümleleri uygulamanın kendi Step(...) metinleri
  var ADIMLAR = {
    Hardware: ["CPU information", "Memory modules", "GPU", "Motherboard and firmware", "Displays", "Audio devices", "USB devices", "Battery"],
    OperatingSystem: ["Windows edition and build", "System configuration", "Locale and time zone"],
    Software: ["Reading uninstall registry (64-bit)", "Reading uninstall registry (32-bit)", "Store packages", ".NET runtimes"],
    Storage: ["Logical volumes", "Physical disks", "BitLocker status"],
    Network: ["Host configuration", "Network adapters", "Adapter 1 of 3", "Adapter 2 of 3", "Proxy configuration"],
    Security: ["Microsoft Defender", "Firewall profiles", "BitLocker volumes", "User Account Control", "Windows Update history", "Registered security products"],
    Users: ["Current user", "Local accounts", "Local groups"],
    Processes: ["Enumerating processes", "Process 8 of 20", "Process 16 of 20", "Verifying signatures"],
    Services: ["Enumerating services"],
    Startup: ["Run keys", "Startup folders"],
    ScheduledTasks: ["Reading task folders", "Task triggers and actions"],
    EventLogs: ["Reading the System log", "Reading the Application log", "Reading the Security log", "Event log summary complete"],
    FileSystem: ["Inventorying D:\\Ortak\\Projeler", "1200 files in D:\\Ortak\\Projeler", "3900 files in D:\\Ortak\\Projeler", "Analysing duplicate candidates"],
    Performance: ["Sample 3 of 12", "Sample 6 of 12", "Sample 9 of 12", "Sample 12 of 12"],
  };

  var params = new URLSearchParams(location.search);
  var veri = null;
  var durum = {
    sayfa: params.get("sayfa") || "Dashboard",
    bitti: params.get("durum") === "bitti",
    calisiyor: false,
    iptal: false,
    yonetici: params.get("durum") === "bitti",
    izinli: params.get("durum") === "bitti",
    secim: {},
    klasorler: ["D:\\Ortak\\Projeler"],
    gecen: 0, kalan: 0, yuzde: 0, oge: 0, simdiki: "", islem: "",
    raporSilindi: false,
  };
  KATEGORILER.forEach(function (k) { durum.secim[k[0]] = k[0] !== "FileSystem"; });
  if (durum.bitti) durum.secim.FileSystem = true;

  // ---------------- yardımcılar ----------------
  function bayt(n) {
    if (n == null) return YOK;
    var b = ["B", "KB", "MB", "GB", "TB"], v = Math.abs(n), u = 0;
    while (v >= 1024 && u < b.length - 1) { v /= 1024; u++; }
    var d = u === 0 ? 0 : v < 10 ? 2 : 1;
    return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString("tr-TR") + " " + b[u];
  }
  function yuzde(v) { return v == null ? YOK : (Math.round(v * 10) / 10).toLocaleString("tr-TR") + "%"; }
  function tarih(s) {
    if (!s) return YOK;
    var m = String(s).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    return m ? m[1] + " " + m[2] : YOK;
  }
  function ya(v) { return v || YOK; }
  function eh(b) { return b == null ? YOK : b ? "Evet" : "Hayır"; }
  function sure(ms) { var s = ms / 1000; return s >= 60 ? Math.floor(s / 60) + "m " + Math.floor(s % 60) + "s" : s.toFixed(1).replace(".", ",") + "s"; }
  function durus(p) { return p === "Enabled" ? ["Enabled", "ok"] : p === "Disabled" ? ["Disabled", "bad"] : ["Unknown", "warn"]; }
  function bildir(m) { var b = $("#bildirim"); b.textContent = m; b.classList.add("goster"); clearTimeout(bildir.t); bildir.t = setTimeout(function () { b.classList.remove("goster"); }, 3200); }

  // Bilgi + tablo blokları (SectionView şablonu)
  function blok(b) {
    var h = '<div class="kart"><div class="bolum-baslik">' + esc(b.baslik) + "</div>";
    if (b.bilgi && b.bilgi.length) {
      h += '<div class="bilgi">';
      b.bilgi.forEach(function (f) {
        h += "<span>" + esc(f[0]) + '</span><span class="' + (f[2] ? "ton-" + f[2] : "") + '">' + esc(f[1] == null || f[1] === "" ? YOK : f[1]) + "</span>";
      });
      h += "</div>";
    }
    if (b.satirlar && b.satirlar.length) {
      h += '<div class="tablo-sar"><table><thead><tr>' + b.sutunlar.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
      b.satirlar.forEach(function (r) { h += "<tr>" + r.map(function (c) { return '<td title="' + esc(c) + '">' + esc(c == null || c === "" ? YOK : c) + "</td>"; }).join("") + "</tr>"; });
      h += "</tbody></table></div>";
    }
    if (b.not) h += '<p class="soluk not">' + esc(b.not) + "</p>";
    return h + "</div>";
  }

  // ---------------- SectionBuilder aktarımı ----------------
  var KURUCU = {
    Hardware: function (r) {
      var h = r.Hardware, out = [];
      h.Processors.forEach(function (c) {
        out.push({ baslik: ya(c.Name), bilgi: [["Manufacturer", c.Manufacturer], ["Cores", c.CoreCount], ["Logical processors", c.LogicalProcessorCount],
          ["Max clock", c.MaxClockSpeedMhz ? c.MaxClockSpeedMhz + " MHz" : null], ["Load during scan", yuzde(c.CurrentUsagePercent)], ["Architecture", c.Architecture], ["Virtualization", eh(c.VirtualizationEnabled)]] });
      });
      var m = h.Memory, kul = m.TotalBytes - m.AvailableBytes, oran = kul * 100 / m.TotalBytes;
      out.push({ baslik: "Memory", bilgi: [["Total", bayt(m.TotalBytes)], ["Available", bayt(m.AvailableBytes)], ["In use", bayt(kul)], ["Utilisation", yuzde(oran), oran > 90 ? "bad" : oran > 75 ? "warn" : "ok"]],
        sutunlar: ["Slot", "Capacity", "Speed", "Type", "Manufacturer", "Part number"], satirlar: m.Modules.map(function (x) { return [x.Slot, bayt(x.CapacityBytes), x.SpeedMts + " MT/s", x.MemoryType, x.Manufacturer, x.PartNumber]; }) });
      out.push({ baslik: "Graphics", sutunlar: ["Adapter", "Manufacturer", "Driver", "Driver date", "Video memory"], satirlar: h.GraphicsAdapters.map(function (g) { return [g.Name, g.Manufacturer, g.DriverVersion, tarih(g.DriverDate).slice(0, 10), bayt(g.VideoMemoryBytes)]; }) });
      var b = h.Motherboard;
      out.push({ baslik: "Motherboard and firmware", bilgi: [["System manufacturer", b.SystemManufacturer], ["System model", b.SystemModel], ["System serial", b.SystemSerialNumber], ["Board", b.Manufacturer + " " + b.Product],
        ["Chassis", b.ChassisType], ["BIOS version", b.BiosVersion], ["BIOS date", tarih(b.BiosDate)], ["Firmware type", b.FirmwareType], ["Secure Boot", eh(b.SecureBootEnabled), b.SecureBootEnabled ? "ok" : "warn"]] });
      out.push({ baslik: "Displays", sutunlar: ["Manufacturer", "Model", "Resolution", "Refresh", "Year"], satirlar: h.Monitors.map(function (x) { return [x.Manufacturer, x.Model + (x.IsPrimary ? " (primary)" : ""), x.HorizontalResolution + " × " + x.VerticalResolution, x.RefreshRateHz + " Hz", x.YearOfManufacture]; }) });
      out.push({ baslik: "Audio", sutunlar: ["Device", "Manufacturer", "Status"], satirlar: h.AudioDevices.map(function (x) { return [x.Name, x.Manufacturer, x.Status]; }) });
      out.push({ baslik: "USB devices", sutunlar: ["Device", "Manufacturer", "Class", "Status"], satirlar: h.UsbDevices.map(function (x) { return [x.Name, x.Manufacturer, x.DeviceType, x.Status]; }) });
      return out;
    },
    Software: function (r) {
      var s = r.Software;
      return [
        { baslik: "Installed applications (" + s.Applications.length + ")", sutunlar: ["Application", "Version", "Publisher", "Installed", "Source"],
          satirlar: s.Applications.slice().sort(function (a, b) { return a.Name.localeCompare(b.Name); }).map(function (a) { return [a.Name, a.Version, a.Publisher, tarih(a.InstallDate).slice(0, 10), a.Source]; }) },
        { baslik: "Runtimes and frameworks", sutunlar: ["Component", "Version", "Kind"], satirlar: s.Runtimes.map(function (a) { return [a.Name, a.Version, a.Kind]; }) },
        { baslik: "Store packages (" + s.StorePackages.length + ")", sutunlar: ["Package", "Version", "Architecture", "Publisher"], satirlar: s.StorePackages.map(function (a) { return [a.Name, a.Version, a.Architecture, a.Publisher]; }) },
      ];
    },
    Network: function (r) {
      var n = r.Network, aktif = n.Adapters.filter(function (a) { return !a.IsVirtualOrLoopback && a.Status === "Up"; }).length;
      return [
        { baslik: "Host", bilgi: [["Host name", n.HostName], ["DNS domain", n.DomainName], ["Network available", eh(n.IsNetworkAvailable)], ["Active adapters", aktif], ["Proxy enabled", eh(n.Proxy.ProxyEnabled)], ["Proxy server", n.Proxy.ProxyServer]] },
        { baslik: "Adapters", sutunlar: ["Adapter", "Type", "Status", "MAC", "IPv4", "Gateway", "DNS", "DHCP"],
          satirlar: n.Adapters.map(function (a) { return [a.Name, a.InterfaceType, a.Status, a.MacAddress, a.IPv4Addresses.join(", "), a.Gateways.join(", "), a.DnsServers.join(", "), eh(a.DhcpEnabled)]; }) },
      ];
    },
    Security: function (r) {
      var s = r.Security, d = s.Defender, fw = s.FirewallProfiles;
      var fwGenel = fw.every(function (p) { return p.Enabled === "Enabled"; }) ? "Enabled" : "Disabled";
      var sis = (s.BitLockerVolumes.filter(function (v) { return v.DriveLetter === "C:"; })[0] || {}).Protected || "Unknown";
      var f = function (ad, p) { var x = durus(p); return [ad, x[0], x[1]]; };
      var wu = s.WindowsUpdate;
      return [
        { baslik: "Protection status", bilgi: [f("Defender real-time", d.RealTimeProtection), f("Tamper protection", d.TamperProtection), f("Firewall", fwGenel), f("BitLocker (system volume)", sis), f("User Account Control", s.Uac.Enabled), f("Secure Boot", s.SecureBoot)] },
        { baslik: "Microsoft Defender", bilgi: [["Signature version", d.SignatureVersion], ["Signature age", d.SignatureAgeDays + " day(s)", d.SignatureAgeDays > 7 ? "warn" : "ok"], ["Last signature update", tarih(d.LastSignatureUpdate)], ["Engine version", d.EngineVersion], ["Last quick scan", tarih(d.LastQuickScan)], ["Last full scan", tarih(d.LastFullScan)]] },
        { baslik: "Firewall profiles", sutunlar: ["Profile", "Enabled", "Inbound default", "Outbound default"], satirlar: fw.map(function (p) { return [p.Profile, p.Enabled, p.DefaultInboundAction, p.DefaultOutboundAction]; }) },
        { baslik: "Windows Update", bilgi: [["Last successful install", tarih(wu.LastInstallDate)], ["Days since last update", wu.DaysSinceLastUpdate, wu.DaysSinceLastUpdate > 30 ? "bad" : "ok"], ["Restart pending", eh(wu.RebootRequired), wu.RebootRequired ? "warn" : "ok"], ["Installed packages", wu.InstalledUpdates.length]],
          sutunlar: ["Update", "Description", "Installed"], satirlar: wu.InstalledUpdates.map(function (u) { return [u.HotFixId, u.Description, tarih(u.InstalledOn).slice(0, 10)]; }) },
        { baslik: "Drive encryption", sutunlar: ["Volume", "Protection", "Conversion", "Method", "Encrypted %"], satirlar: s.BitLockerVolumes.map(function (v) { return [v.DriveLetter, v.ProtectionStatus, v.ConversionStatus, v.EncryptionMethod, v.EncryptionPercentage + "%"]; }) },
        { baslik: "Registered security products", sutunlar: ["Product", "Type", "Enabled", "Definitions current"], satirlar: s.SecurityProducts.map(function (p) { return [p.Name, p.ProductType, p.Enabled, p.UpToDate]; }) },
      ];
    },
    Storage: function (r) {
      var s = r.Storage;
      return [
        { baslik: "Volumes", sutunlar: ["Drive", "Label", "File system", "Type", "Total", "Used", "Free", "Used %", "BitLocker"],
          satirlar: s.LogicalDrives.map(function (v) { var u = v.TotalBytes - v.FreeBytes; return [v.DriveLetter, v.VolumeLabel, v.FileSystem, v.DriveType, bayt(v.TotalBytes), bayt(u), bayt(v.FreeBytes), yuzde(u * 100 / v.TotalBytes), v.BitLockerStatus]; }) },
        { baslik: "Physical disks", sutunlar: ["Model", "Media", "Bus", "Size", "Partitions", "Health", "Volumes"],
          satirlar: s.PhysicalDisks.map(function (d) { return [d.Model, d.MediaType, d.BusType, bayt(d.SizeBytes), d.PartitionCount, d.HealthStatus, d.LogicalDrives.join(", ")]; }) },
      ];
    },
    Processes: function (r) {
      return [
        { baslik: "Running processes (" + r.Processes.length + ")", sutunlar: ["Process", "PID", "Parent", "Memory", "Started", "Signed by", "Access"],
          satirlar: r.Processes.slice().sort(function (a, b) { return (b.MemoryBytes || 0) - (a.MemoryBytes || 0); }).map(function (p) { return [p.Name, p.ProcessId, p.ParentProcessId, bayt(p.MemoryBytes), tarih(p.StartTime), p.IsSigned ? p.Publisher : "(unsigned)", p.Access]; }) },
        { baslik: "Services (" + r.Services.length + ")", sutunlar: ["Service", "Display name", "Status", "Start type", "Account"], satirlar: r.Services.map(function (s) { return [s.Name, s.DisplayName, s.Status, s.StartType, s.Account]; }) },
        { baslik: "Startup items (" + r.Startup.length + ")", sutunlar: ["Name", "Scope", "Enabled", "Command"], satirlar: r.Startup.map(function (s) { return [s.Name, s.Scope, eh(s.IsEnabled), s.Command]; }) },
        { baslik: "Scheduled tasks (" + r.ScheduledTasks.length + ")", sutunlar: ["Task", "State", "Last run", "Next run", "Triggers"], satirlar: r.ScheduledTasks.map(function (t) { return [t.Path, t.State, tarih(t.LastRunTime), tarih(t.NextRunTime), t.TriggerSummary]; }) },
      ];
    },
    Events: function (r) {
      var e = r.EventLogs, top = function (k) { return e.Channels.reduce(function (s, c) { return s + c[k]; }, 0); };
      var kr = top("CriticalCount"), er = top("ErrorCount");
      var out = [{ baslik: "Channel summary", bilgi: [["Window", tarih(e.WindowStart) + " → " + tarih(e.WindowEnd)], ["Critical", kr, kr > 0 ? "bad" : "ok"], ["Errors", er, er > 0 ? "warn" : "ok"], ["Warnings", top("WarningCount")]],
        sutunlar: ["Channel", "Readable", "Critical", "Errors", "Warnings", "Examined"], satirlar: e.Channels.map(function (c) { return [c.Channel, eh(c.Accessible), c.CriticalCount, c.ErrorCount, c.WarningCount, tr.format(c.TotalExamined) + (c.Truncated ? " (capped)" : "")]; }) }];
      e.Channels.forEach(function (c) {
        if (!c.Records.length) return;
        out.push({ baslik: c.Channel + " — recent entries", sutunlar: ["Time", "Level", "Provider", "Event ID", "Message"], satirlar: c.Records.map(function (x) { return [tarih(x.TimeCreated), x.Level, x.Provider, x.EventId, x.Message]; }) });
      });
      return out;
    },
    Files: function (r) {
      var f = r.Files, out = [{ baslik: "Summary", bilgi: [["Folders inventoried", f.Roots.length], ["Files", tr.format(f.TotalFiles)], ["Total size", bayt(f.TotalSizeBytes)], ["SHA-256 hashing", f.HashingEnabled ? "Enabled" : "Disabled"], ["Duplicate analysis", f.DuplicateAnalysisEnabled ? "Enabled" : "Disabled"]] }];
      f.Roots.forEach(function (k) {
        out.push({ baslik: k.RootPath, bilgi: [["Files", tr.format(k.FileCount)], ["Directories", tr.format(k.DirectoryCount)], ["Total size", bayt(k.TotalSizeBytes)], ["Skipped locations", k.InaccessiblePaths.length, k.InaccessiblePaths.length ? "warn" : "ok"], ["Truncated", k.Truncated ? "Yes" : "No"]],
          sutunlar: ["Extension", "Files", "Size"], satirlar: k.ByExtension.map(function (x) { return [x.Extension, tr.format(x.Count), bayt(x.TotalBytes)]; }) });
      });
      out.push({ baslik: "Potential duplicates (" + f.DuplicateGroups.length + ")", sutunlar: ["Size", "Copies", "Reclaimable", "Paths"],
        satirlar: f.DuplicateGroups.map(function (g) { return [bayt(g.SizeBytes), g.Paths.length, bayt(g.SizeBytes * (g.Paths.length - 1)), g.Paths.join("  |  ")]; }) });
      return out;
    },
    Report: function (r) {
      var m = r.Metadata, h = r.HealthScore;
      var faktor = h.Factors.slice().sort(function (a, b) { return (a.Evaluated ? 0 : 1) - (b.Evaluated ? 0 : 1) || a.Points - b.Points; });
      var out = [
        { baslik: "Yönetici Özeti", bilgi: [["Bilgisayar Adı", m.ComputerName], ["Geçerli Kullanıcı", m.CurrentUser], ["Oluşturulma", tarih(m.ScanCompleted)], ["Süre", "41,6s"], ["Bulunan Öğe", tr.format(r.TotalItemsDiscovered)],
          ["Uyarılar", r.Warnings.length, r.Warnings.length ? "warn" : "ok"], ["Hatalar", r.Errors.length, r.Errors.length ? "bad" : "ok"], ["Yönetici Durumu", durum.yonetici ? "Yönetici taraması" : "Standart kullanıcı taraması"]] },
        { baslik: "Puan dökümü", sutunlar: ["Area", "Finding", "Points"], satirlar: faktor.map(function (f) { return [f.Area, f.Description, !f.Evaluated ? "Değerlendirilmedi — veri yok" : f.Points === 0 ? "0" : (f.Points > 0 ? "+" : "") + f.Points]; }),
          not: "This score summarises configuration hygiene only. It is not an antivirus verdict, a vulnerability assessment or a compliance audit." },
        { baslik: "Toplama Durumu", sutunlar: ["Collector", "Category", "Status", "Items", "Duration (ms)", "Issues"], satirlar: r.CollectionStatus.map(function (c) { return [c.Collector, c.Category, c.Status, tr.format(c.ItemCount), tr.format(c.DurationMs), c.Issues.length]; }) },
      ];
      if (r.Warnings.length) out.push({ baslik: "Uyarılar", sutunlar: ["Severity", "Source", "Message"], satirlar: r.Warnings.map(function (w) { return [w.Severity, w.Source, w.Message]; }) });
      return out;
    },
  };

  // ---------------- sayfalar ----------------
  function dashboard() {
    var r = veri, s = r.System;
    var son = durum.bitti ? "Tarama Tamamlandı · puan " + r.HealthScore.Score + " · " + tr.format(r.TotalItemsDiscovered) + " öğe" : "Henüz tarama yapılmadı.";
    var h = '<div class="kart"><div class="kimlik">' +
      kv("Bilgisayar Adı", r.Metadata.ComputerName) + kv("Windows Sürümü", s.Edition + " " + s.DisplayVersion + " (" + s.BuildNumber + "." + s.UpdateBuildRevision + ")") + kv("Geçerli Kullanıcı", r.Metadata.CurrentUser) +
      kv("Tarama İzni Durumu", durum.izinli ? "Bu oturum için yetkilendirildi" : "Onay bekleniyor") + kv("Yönetici Durumu", durum.yonetici ? "Yönetici olarak çalışıyor" : "Standart kullanıcı") + kv("Son Tarama", son) +
      "</div></div>";
    h += '<div class="bolum-baslik">Tarama Kategorileri</div><div class="kategoriler">';
    KATEGORILER.forEach(function (k) {
      var acik = durum.secim[k[0]];
      h += '<div class="kat-kart"><div class="kalin">' + k[1] + '</div><div class="durum' + (acik ? " acik" : "") + '">' + (acik ? "✓ Etkin" : "— Seçili değil") + "</div></div>";
    });
    h += '</div><div class="kart"><p class="soluk">Bu uygulama bilgisayarınızın sistem yapılandırması ve açıkça seçtiğiniz klasörler hakkında teknik envanter oluşturacaktır. Hiçbir veri yüklenmez; parola, belirteç, çerez veya anahtar asla toplanmaz.</p>' +
      '<p class="soluk ust8">Parolalar, parola özetleri, kimlik doğrulama belirteçleri, oturum çerezleri, tarayıcıda kayıtlı kimlik bilgileri, özel anahtarlar, Kimlik Bilgisi Yöneticisi kayıtları, Wi-Fi anahtarları, ödeme bilgileri, mesaj içerikleri ve herhangi bir dosyanın içeriği.</p></div>';
    return h;
  }
  function kv(a, b) { return '<div><div class="etiket">' + esc(a) + '</div><div class="kalin">' + esc(b) + "</div></div>"; }

  function tarama() {
    if (durum.calisiyor) {
      return '<div class="kart"><div class="baslik" style="margin:0">' + esc(durum.simdiki ? durum.simdiki + " taranıyor…" : "Hazırlanıyor…") + '</div>' +
        '<div class="ilerleme"><div class="cubuk"><i id="t-cubuk" style="width:' + durum.yuzde + '%"></i></div><b id="t-yuzde">%' + Math.round(durum.yuzde) + "</b></div>" +
        '<p class="soluk" id="t-islem" style="margin:4px 0 12px">' + esc(durum.islem) + "</p>" +
        '<div class="dort">' + kv2("Şu an", durum.simdiki || "—", "t-simdi") + kv2("Bulunan öğe", tr.format(durum.oge), "t-oge") + kv2("Geçen süre", durum.gecen + " sn", "t-gecen") + kv2("Tahmini kalan", durum.kalan + " sn", "t-kalan") + "</div>" +
        '<button class="dugme ust16" id="t-iptal">Taramayı İptal Et</button></div>';
    }
    if (durum.bitti) {
      var r = veri, puan = durum.iptal ? Math.max(40, r.HealthScore.Score - 0) : r.HealthScore.Score;
      var ton = puan >= 75 ? "iyi" : puan >= 55 ? "uyari" : "kotu";
      var renk = { iyi: "var(--iyi)", uyari: "var(--uyari)", kotu: "var(--kotu)" }[ton];
      var derece = puan >= 90 ? "Excellent" : puan >= 75 ? "Good" : puan >= 55 ? "Fair" : "NeedsAttention";
      return '<div class="kart"><div class="baslik" style="margin:0">' + (durum.iptal ? "Tarama İptal Edildi" : "Tarama Tamamlandı") + "</div>" +
        '<div class="sonuc"><div class="halka" style="border-color:' + renk + '"><b style="color:' + renk + '">' + puan + '</b><span class="soluk">' + derece + "</span></div>" +
        '<div class="iki">' + kv3("Süre", durum.iptal ? sure(durum.gecen * 1000) : "41,6s") + kv3("Bulunan Öğe", tr.format(durum.iptal ? durum.oge : r.TotalItemsDiscovered)) +
        kv3("Uyarılar", r.Warnings.length, "var(--uyari)") + kv3("Hatalar", r.Errors.length, "var(--kotu)") + "</div></div>" +
        '<div class="sarmal"><button class="dugme birincil" id="r-ac"' + (durum.raporSilindi ? " disabled" : "") + '>Raporu Aç</button><button class="dugme" id="r-json"' + (durum.raporSilindi ? " disabled" : "") + '>JSON Dışa Aktar</button>' +
        '<button class="dugme" id="r-klasor">Rapor Klasörünü Aç</button><button class="dugme" id="r-sil"' + (durum.raporSilindi ? " disabled" : "") + ">Raporu Sil</button></div></div>";
    }
    return '<div class="kart"><div class="bolum-baslik">Tarama Yetkilendirmesi</div><p class="soluk">Bu uygulama bilgisayarınızın sistem yapılandırması ve açıkça seçtiğiniz klasörler hakkında teknik envanter oluşturacaktır. Hiçbir veri yüklenmez; parola, belirteç, çerez veya anahtar asla toplanmaz.</p>' +
      '<button class="dugme birincil ust16" id="t-basla">Taramayı Başlat</button></div>';
  }
  function kv2(a, b, id) { return '<div><div class="etiket">' + a + '</div><div class="kalin" id="' + id + '">' + esc(b) + "</div></div>"; }
  function kv3(a, b, renk) { return '<div><div class="etiket">' + a + '</div><div class="deger"' + (renk ? ' style="color:' + renk + '"' : "") + ">" + esc(b) + "</div></div>"; }

  function ayarlar() {
    return '<div class="kart"><div class="form-izgara">' +
      "<span>Tema</span><select><option>Windows ile aynı</option><option>Açık</option><option selected>Koyu</option></select>" +
      "<span>Dil</span><select><option>Windows ile aynı</option><option>English</option><option selected>Türkçe</option></select>" +
      "<span>Olay günlüğü zaman aralığı</span><select><option>Son 24 saat</option><option selected>Son 7 gün</option><option>Son 30 gün</option></select>" +
      '<span>Kanal başına en fazla olay</span><input type="text" value="1000"></div>' +
      '<label class="onay ust10"><input type="checkbox"><i></i>SHA-256 özeti hesapla (daha yavaş)</label><label class="onay"><input type="checkbox"><i></i>Yinelenen dosyaları tespit et</label></div>' +
      '<div class="kart"><div class="bolum-baslik">Rapor çıktı klasörü</div><div class="satir"><input type="text" value="E:\\PeraScan\\Reports" style="flex:1;min-width:0"><button class="dugme" data-bildir="Tanıtımda klasör seçilemez.">Gözat…</button></div>' +
      '<p class="soluk ust8">E:\\PeraScan\\settings.json</p></div>' +
      '<div class="kart"><div class="bolum-baslik">Telemetri</div><p class="soluk">Devre dışı — bu sürümde telemetri kodu bulunmuyor.</p></div>' +
      '<button class="dugme birincil" data-bildir="Ayarlar kaydedildi.">Kaydet</button>';
  }
  function gizlilik() {
    return '<div class="kart"><div class="bolum-baslik">Toplananlar</div><p class="soluk">Donanım ve bellenim envanteri, işletim sistemi ayrıntıları, kurulu yazılımlar, depolama düzeni, ağ yapılandırması, güvenlik durumu göstergeleri, hesap adları, çalışan süreçler, hizmetler, başlangıç öğeleri, zamanlanmış görevler, olay günlüğü özetleri ve — yalnızca siz etkinleştirirseniz — kendi seçtiğiniz klasörlerden dosya üstverisi.</p></div>' +
      '<div class="kart"><div class="bolum-baslik">Asla toplanmayanlar</div><p class="soluk">Parolalar, parola özetleri, kimlik doğrulama belirteçleri, oturum çerezleri, tarayıcıda kayıtlı kimlik bilgileri, özel anahtarlar, Kimlik Bilgisi Yöneticisi kayıtları, Wi-Fi anahtarları, ödeme bilgileri, mesaj içerikleri ve herhangi bir dosyanın içeriği.</p></div>' +
      '<div class="kart"><div class="bolum-baslik">Raporun saklandığı yer</div><p class="soluk">Raporlar yalnızca aşağıda gösterilen klasöre, bu makineye veya çıkarılabilir sürücünüze yazılır. Uygulama hiçbir ağ iletişimi yapmaz ve hiçbir şey yüklemez.</p><p class="kalin ust8">E:\\PeraScan\\Reports</p>' +
      '<button class="dugme ust10" id="g-sil">Raporları Sil</button></div>';
  }

  // ---------------- çizim ----------------
  function gezintiCiz() {
    $("#gezinti").innerHTML = SAYFALAR.map(function (p) {
      var kapali = p[2] && !durum.bitti;
      return '<button class="gez" role="tab" data-sayfa="' + p[0] + '" aria-selected="' + (durum.sayfa === p[0]) + '"' + (kapali ? " disabled" : "") + ">" + p[1] + "</button>";
    }).join("");
  }
  function ciz() {
    if (!veri) return;
    var p = SAYFALAR.filter(function (x) { return x[0] === durum.sayfa; })[0];
    if (!p || (p[2] && !durum.bitti)) { durum.sayfa = "Dashboard"; p = SAYFALAR[0]; }
    $("#sayfa-baslik").textContent = p[1];
    var h;
    if (p[0] === "Dashboard") h = dashboard();
    else if (p[0] === "Scan") h = tarama();
    else if (p[0] === "Settings") h = ayarlar();
    else if (p[0] === "Privacy") h = gizlilik();
    else h = KURUCU[p[0]](veri).map(blok).join("");
    $("#sayfa").innerHTML = h;
    gezintiCiz();
    $("#tara-dugme").disabled = durum.calisiyor;
  }
  function git(s) { durum.sayfa = s; ciz(); $("#sayfa").scrollTop = 0; try { parent.postMessage({ pcAudit: 1, sayfa: s }, "*"); } catch (_) {} }

  // ---------------- izin penceresi ----------------
  function izinAc() {
    if (durum.calisiyor) return;
    $("#kategori-sec").innerHTML = KATEGORILER.map(function (k) {
      return '<label class="onay"><input type="checkbox" data-kat="' + k[0] + '"' + (durum.secim[k[0]] ? " checked" : "") + "><i></i><span>" + k[1] + (YUKSELTME[k[0]] ? '<span class="anahtar" title="Returns more data when run as administrator"> ⚿</span>' : "") + "</span></label>";
    }).join("");
    klasorCiz();
    $("#dosya-kart").hidden = !durum.secim.FileSystem;
    $("#izin-hata").textContent = "";
    $("#izin-perde").hidden = false;
    $("#yetkilendir").focus();
  }
  var seciliKlasor = -1;
  function klasorCiz() {
    $("#klasorler").innerHTML = durum.klasorler.length ? durum.klasorler.map(function (k, i) { return '<div data-i="' + i + '" class="' + (i === seciliKlasor ? "sec" : "") + '">' + esc(k) + "</div>"; }).join("") : '<div class="soluk">Seçili klasör yok.</div>';
  }
  function izinKapat() { $("#izin-perde").hidden = true; }

  function yetkilendir() {
    var secili = KATEGORILER.filter(function (k) { return durum.secim[k[0]]; });
    if (!secili.length) { $("#izin-hata").textContent = "Devam etmek için en az bir kategori seçin."; return; }
    if (durum.secim.FileSystem && !durum.klasorler.length) { $("#izin-hata").textContent = "En az bir klasör ekleyin veya dosya sistemi envanterini kapatın."; return; }
    izinKapat();
    durum.izinli = true;
    var etkilenen = secili.filter(function (k) { return YUKSELTME[k[0]]; }).map(function (k) { return k[1]; });
    if (!durum.yonetici && etkilenen.length) {
      $("#yetki-etkilenen").textContent = "Etkilenen kategoriler: " + etkilenen.join(", ");
      $("#yetki-perde").hidden = false;
      $("#yetki-yukselt").focus();
    } else taramaBaslat();
  }

  // ---------------- tarama canlandırması ----------------
  var zamanlayici = null;
  function taramaBaslat() {
    var plan = veri.CollectionStatus.filter(function (c) { return durum.secim[c.Category]; });
    var toplamMs = plan.reduce(function (s, c) { return s + c.DurationMs; }, 0);
    var olcek = 9000 / toplamMs;                 // gerçek süreler ~9 saniyeye sığdırılır
    durum.calisiyor = true; durum.bitti = false; durum.iptal = false; durum.raporSilindi = false;
    durum.oge = 0; durum.yuzde = 0; durum.gecen = 0; durum.simdiki = ""; durum.islem = "Hazırlanıyor…";
    git("Scan");
    var bas = performance.now(), i = 0, adimBas = bas + 600, oncekiOge = 0;
    var kat = function (c) { return (KATEGORILER.filter(function (k) { return k[0] === c.Category; })[0] || [0, c.Category])[1]; };
    zamanlayici = setInterval(function () {
      var simdi = performance.now();
      durum.gecen = Math.floor((simdi - bas) / 1000);
      if (simdi < adimBas) return;
      var c = plan[i];
      if (!c) { bitir(); return; }
      var sureMs = Math.max(350, c.DurationMs * olcek), oran = Math.min(1, (simdi - adimBas) / sureMs);
      var adimlar = ADIMLAR[c.Collector] || [c.Collector];
      durum.simdiki = kat(c);
      durum.islem = adimlar[Math.min(adimlar.length - 1, Math.floor(oran * adimlar.length))];
      durum.oge = oncekiOge + Math.round(c.ItemCount * oran);
      var bitenMs = plan.slice(0, i).reduce(function (s, x) { return s + x.DurationMs; }, 0) + c.DurationMs * oran;
      durum.yuzde = bitenMs * 100 / toplamMs;
      durum.kalan = Math.max(0, Math.round((toplamMs - bitenMs) * olcek / 1000));
      if (oran >= 1) { oncekiOge += c.ItemCount; i++; adimBas = simdi; }
      guncelle();
    }, 90);
  }
  function guncelle() {
    if (durum.sayfa !== "Scan" || !$("#t-cubuk")) { if (durum.sayfa === "Scan") ciz(); return; }
    $(".kart .baslik", $("#sayfa")).textContent = durum.simdiki + " taranıyor…";
    $("#t-cubuk").style.width = durum.yuzde + "%";
    $("#t-yuzde").textContent = "%" + Math.round(durum.yuzde);
    $("#t-islem").textContent = durum.islem;
    $("#t-simdi").textContent = durum.simdiki;
    $("#t-oge").textContent = tr.format(durum.oge);
    $("#t-gecen").textContent = durum.gecen + " sn";
    $("#t-kalan").textContent = durum.kalan + " sn";
  }
  function bitir(iptal) {
    clearInterval(zamanlayici);
    durum.calisiyor = false; durum.bitti = true; durum.iptal = !!iptal;
    if (!iptal) { durum.islem = "Rapor yazılıyor…"; }
    ciz();
    bildir(iptal ? "Tarama iptal edildi; tamamlanan bölümlerle kısmi rapor yazıldı." : "Rapor yazıldı: E:\\PeraScan\\Reports\\PeraScan_DEMO-OFIS-01_20261106-101400.html");
    try { parent.postMessage({ pcAudit: 1, bitti: true }, "*"); } catch (_) {}
  }

  function onay(metin, evet) {
    $("#onay-metin").textContent = metin;
    $("#onay-perde").hidden = false;
    $("#onay-evet").onclick = function () { $("#onay-perde").hidden = true; evet(); };
    $("#onay-hayir").onclick = function () { $("#onay-perde").hidden = true; };
    $("#onay-hayir").focus();
  }

  // ---------------- olaylar ----------------
  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, label, .liste div");
    if (!t) return;
    if (t.dataset.sayfa) git(t.dataset.sayfa);
    else if (t.id === "tara-dugme" || t.id === "t-basla") izinAc();
    else if (t.id === "cikis-dugme") bildir("Tanıtım sürümünde uygulama kapanmaz.");
    else if (t.hasAttribute("data-kapat")) izinKapat();
    else if (t.id === "hepsini-sec" || t.id === "hicbiri") {
      var hep = t.id === "hepsini-sec";
      KATEGORILER.forEach(function (k) { durum.secim[k[0]] = hep; });
      document.querySelectorAll("#kategori-sec input").forEach(function (i) { i.checked = hep; });
      $("#dosya-kart").hidden = !hep;
    }
    else if (t.id === "klasor-ekle") {
      var aday = ["C:\\Users\\demo.kullanici\\Documents", "D:\\Ortak\\Muhasebe", "D:\\Arşiv"].filter(function (k) { return durum.klasorler.indexOf(k) < 0; })[0];
      if (aday) { durum.klasorler.push(aday); klasorCiz(); } else bildir("Tanıtımda başka klasör eklenemez.");
    }
    else if (t.id === "klasor-kaldir") { if (seciliKlasor >= 0) { durum.klasorler.splice(seciliKlasor, 1); seciliKlasor = -1; klasorCiz(); } }
    else if (t.matches(".liste div[data-i]")) { seciliKlasor = +t.dataset.i; klasorCiz(); }
    else if (t.id === "yetkilendir") yetkilendir();
    else if (t.id === "yetki-yukselt") { $("#yetki-perde").hidden = true; durum.yonetici = true; bildir("Windows UAC isteği onaylandı (tanıtım) — yönetici olarak yeniden başlatıldı."); taramaBaslat(); }
    else if (t.id === "yetki-devam") { $("#yetki-perde").hidden = true; bildir("Yönetici yetkisi olmadan devam ediliyor."); taramaBaslat(); }
    else if (t.hasAttribute("data-iptal")) { $("#yetki-perde").hidden = true; }
    else if (t.id === "t-iptal") { durum.islem = "İptal ediliyor…"; bitir(true); }
    else if (t.id === "r-ac") window.open("../rapor/ornek-rapor-tr.html", "_blank", "noopener");
    else if (t.id === "r-json") window.open("../rapor/ornek-rapor.json", "_blank", "noopener");
    else if (t.id === "r-klasor") bildir("Masaüstünde Dosya Gezgini'nde E:\\PeraScan\\Reports açılır.");
    else if (t.id === "r-sil") onay("Oluşturulan rapor dosyaları diskten silinsin mi?", function () { durum.raporSilindi = true; ciz(); bildir("Rapor dosyaları silindi. (Tanıtım: gerçek dosya yok.)"); });
    else if (t.id === "g-sil") onay("Çıktı klasöründeki tüm rapor dosyaları silinsin mi?", function () { bildir("Rapor dosyaları silindi. (Tanıtım: gerçek dosya yok.)"); });
    else if (t.dataset.bildir) bildir(t.dataset.bildir);
  });
  document.addEventListener("change", function (e) {
    var k = e.target.dataset && e.target.dataset.kat;
    if (k) { durum.secim[k] = e.target.checked; if (k === "FileSystem") $("#dosya-kart").hidden = !e.target.checked; if (durum.sayfa === "Dashboard") ciz(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!$("#onay-perde").hidden) $("#onay-perde").hidden = true;
    else if (!$("#yetki-perde").hidden) $("#yetki-perde").hidden = true;
    else if (!$("#izin-perde").hidden) izinKapat();
  });
  // Tanıtım sayfasından gelen istekler
  window.addEventListener("message", function (e) {
    var v = e.data || {};
    if (!v.pcAuditTanitim) return;
    if (v.sayfa) { if (!durum.bitti && v.sayfa !== "Dashboard" && v.sayfa !== "Scan" && v.sayfa !== "Settings" && v.sayfa !== "Privacy") { durum.bitti = true; durum.izinli = true; durum.yonetici = true; durum.secim.FileSystem = true; } git(v.sayfa); }
    if (v.tara) izinAc();
  });

  fetch("veri.json").then(function (r) { return r.json(); }).then(function (j) {
    veri = j;
    if (params.get("izin") === "ac") { ciz(); izinAc(); } else ciz();
  }).catch(function () { $("#sayfa").innerHTML = '<div class="kart">Örnek veri yüklenemedi.</div>'; });
})();
