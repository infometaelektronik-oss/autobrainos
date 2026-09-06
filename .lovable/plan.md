# AutoBrain OS — Gerçekçi Ses, Yeni Açılış ve Akıllı Uyarı Motoru

Dört iş bir arada: ChatGPT sesi, sinematik açılış, radar/şerit + Otoyol Modu kuralları, trend tabanlı uyarı motoru ve performans paneli.

## 1. Gerçek insan sesi (ChatGPT sesi)

Şu anki ses tarayıcının yerleşik robot sesi. Onun yerine ChatGPT'nin kendi sesini kullanacağız (Lovable AI üzerinden, ek hesap veya anahtar gerekmeden).

- Metin sunucuya gönderilir, ses akışı geldikçe anında çalar (bekleme yok).
- Sıcak, sakin, güven veren bir sürüş asistanı tonu; Türkçe telaffuz için ses yönlendirmesi verilir.
- Bağlantı yoksa veya ses üretilemezse sistem sessizce eski tarayıcı sesine düşer; asla sessiz kalıp hata vermez.
- Açılış cümleleri gibi hep aynı olan metinler bir kez üretilip cihazda saklanır, her açılışta yeniden üretilmez.

## 2. Yeni açılış ekranı (işletim sistemi hissi)

Mevcut buton merkezli ekran tamamen yenilenir:

- Açılış: ekranın ortasında ince çizgilerle kendini çizen AutoBrain işareti, arkada derin ızgara ve tarama dalgası.
- Alt kısımda gerçek bir sistemin açılışı gibi akan kısa durum satırları (donanım, ECU, sensörler, ağ) ve ilerleme çubuğu.
- Tek dokunuş noktası: alt ortada sade, nabız gibi parlayan bir "Sistemi Başlat" alanı (ses izni için gerekli ilk dokunuş).
- Sinematik açılış sesi: derinden yükselen alt ton + kısa dijital tarama katmanı, sonda parlak bir imza vuruşu. Tarayıcı içinde üretilir, indirilecek dosya yok.
- Sesin hemen ardından ChatGPT sesiyle üç karşılama cümlesi; konuşurken merkezdeki çekirdek magenta tona geçip titreşir, altyazı akar.
- Bitişte panele yumuşak geçiş. Sessiz mod ve "atla" seçeneği kalır.

## 3. Radar / şerit durumu ve Otoyol Modu

- Yeni türetilmiş durumlar: şerit takibi (stabil / kayma / müdahale), öndeki araca takip mesafesi ve kapanma hızı, kör nokta uyarısı. Kaynak: mevcut hız, direksiyon açısı, yanal g, tekerlek hızları ve fren verisi. Gerçek radar donanımı takıldığında aynı arayüz kullanılır.
- Otoyol Modu kuralları netleşir: 100 km/s üzeri girilir, 92 km/s altına düşünce çıkılır (sınırda titremeyi önler), ayrıca 5 saniye kararlılık şartı.
- Otoyol Modunda: medya, ayar ve ikincil sensör kartları gizlenir; hız, şerit/radar şeridi, takip mesafesi ve yalnızca kritik uyarılar kalır. Kritik bir uyarı çıkarsa mod kilidi bozulmadan uyarı öne alınır.

## 4. Eşik + trend tabanlı uyarı motoru

- Her sinyal için kısa geçmiş tutulur; yalnız anlık eşik değil, değişim hızı da değerlendirilir (örn. "hararet son 40 saniyede 6 derece yükseldi, bu hızla 3 dakikada kritik sınıra ulaşır").
- Üç seviye: bilgi / dikkat / kritik. Her seviyenin doğal dil şablonu var: durum + neden + öneri.
- Kapsam: soğutma, yağ, egzoz, akü/alternatör, yakıt tüketimi trendi, DPF dolumu, EGR sapması, balata ömrü, lastik basıncı kaybı.
- Aynı uyarı tekrar tekrar sesli okunmaz; seviye yükselirse yeniden bildirilir.

## 5. Performans / gecikme paneli

Yeni panel: saniyedeki veri yenileme sayısı, son veri gecikmesi, arayüz kare hızı, en yavaş kare, kaçırılan veri paketi oranı ve bağlantı kaynağı. Değerler eşik altına düşerse panel sarı/kırmızıya döner ve AI paneli bunu da yorumlar.

## Teknik notlar

- Ses: sunucu tarafında `/api/tts` benzeri bir uç Lovable AI Gateway `/v1/audio/speech` çağırır (`openai/gpt-4o-mini-tts`, `stream_format: "sse"`, `response_format: "pcm"`); istemci Web Audio ile parça parça çalar. `LOVABLE_API_KEY` yalnız sunucuda. `src/lib/ai/speech.ts` aynı API'yi korur, altyapı değişir; başarısız durumda `speechSynthesis` yedeği.
- Açılış sesi: `src/lib/audio.ts` içinde Web Audio osilatör + gürültü katmanlarıyla üretilen `playBootChime()`.
- `src/lib/ai/driverAssist.ts`: şerit/radar türetme; `driveModeOf` histerezis ve kararlılık süresiyle güncellenir (`src/lib/ai/copilot.ts`).
- `src/lib/ai/trends.ts`: kayan pencere geçmişi + eğim hesabı; `buildInsights` bunu kullanır ve şablonlaşır.
- `src/lib/telemetry/perf.ts` + `PerfPanel.tsx`: tick zaman damgaları, `requestAnimationFrame` ölçümü, `performance.now()`.
- `BootSequence.tsx` yeniden yazılır; kokpit `index.tsx` otoyol düzeni ve yeni paneller için güncellenir.
