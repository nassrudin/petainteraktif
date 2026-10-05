# Journey Map Percaya Diri Berbasis Growth Mindset

Web refleksi untuk layanan bimbingan klasikal kelas X. Siswa mengisi delapan pos dalam dua etape. Secara standar, Pos 5 terbuka tujuh hari setelah Pos 4 disimpan. Guru dapat mengizinkan akses lebih awal.

## Menjalankan

```bash
npm ci
npm run dev
npm run build
npm test
```

Website Vite diterbitkan melalui GitHub Pages di `.github/workflows/deploy.yml`. Hosting tetap di GitHub Pages; Firebase Authentication dan Cloud Firestore menyediakan login dan data bersama.

## Mengaktifkan Firebase

Firebase wajib dikonfigurasi, termasuk saat menjalankan localhost. Jika konfigurasi tidak tersedia, aplikasi berhenti dengan pesan konfigurasi; tidak ada mode data lokal.

1. Buat proyek paket Spark di [Firebase Console](https://console.firebase.google.com/), lalu daftarkan aplikasi Web. Salin `apiKey`, `authDomain`, `projectId`, dan `appId` dari konfigurasi Web ke `.env` lokal berdasarkan [.env.example](.env.example).
2. Di **Authentication → Sign-in method**, aktifkan **Anonymous** untuk siswa dan **Email/Password** untuk akun staf. Biarkan **Google** aktif sementara untuk pembuatan akun admin pertama memakai akun lama `andy.wbowo@gmail.com`. Domain `nassrudin.github.io` tetap ada di **Authentication → Settings → Authorized domains** untuk tahap awal ini.
3. Terapkan [firestore.rules](firestore.rules) **sebelum** menerbitkan kode akun staf: tempel seluruh aturan di **Firestore Database → Rules**, lalu **Publish**. Alternatif Firebase CLI: `firebase deploy --only firestore:rules --project PROJECT_ID`. Aturan tetap memberi akses Google lama hanya selama akun admin belum dibuat; setelah itu hanya admin, guru aktif, dan siswa pemilik jawaban yang mendapat akses masing-masing.
4. Di repositori GitHub, buka **Settings → Secrets and variables → Actions → Variables**. Tambahkan `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, dan `FIREBASE_APP_ID` dari konfigurasi Web. Workflow memasukkannya ke build sebagai `VITE_FIREBASE_*`. Nilai konfigurasi Web terlihat di browser; keamanan jawaban bergantung pada Authentication dan Firestore Rules.
5. Jalankan ulang workflow **Deploy to GitHub Pages**. Untuk pengaturan pertama, klik **Login Guru / Admin → Pengaturan pertama: masuk Google sekali untuk membuat admin**, lalu masuk dengan akun Google lama. Pada tab **Akun Admin & Guru**, buat akun dengan nama pengguna tetap `admin` dan kata sandi pilihan Anda (minimal 12 karakter). Setelah berhasil, akses Google lama berakhir otomatis. Masuk ulang memakai `admin` dan kata sandi tadi. Jika akun utama sudah dibuat sebelum perubahan nama ini, gunakan nama pengguna `admin` dengan kata sandi yang sama; tidak perlu membuat akun baru.
6. Pada tab **Akun Admin & Guru**, admin dapat membuat akun guru dengan nama pengguna dan kata sandi, serta menonaktifkan atau mengaktifkan aksesnya. Guru masuk tanpa email pribadi. Uji di dua browser: siswa mengisi satu pos pada browser pertama, kemudian guru masuk pada browser kedua dan memeriksa rekap.

Alamat email internal acak dibuat otomatis oleh aplikasi untuk Firebase Authentication; pengguna tidak memasukkan atau menerima email. Kata sandi tidak disimpan di Firestore maupun kode situs. Guru dapat mengganti kata sandinya sendiri dengan kata sandi saat ini. Jika guru lupa kata sandi, admin menonaktifkan akun lama lalu membuat akun pengganti. Jika admin lupa kata sandi, pemilik proyek Firebase perlu memulihkannya secara manual lewat administrasi Firebase; tidak ada tautan reset email. Menonaktifkan guru mencabut akses data, tetapi akun Authentication-nya tetap tercatat karena penghapusan akun orang lain memerlukan Admin SDK di server.

Data siswa dan pengaturan hanya dibaca dari Firebase. Impor otomatis data browser dan pembacaan draf lokal sudah dihapus. Sesi login anonim Firebase tetap melekat pada browser/perangkat. Untuk berpindah browser/perangkat, siswa memakai **kode akses siswa**; nama, kelas, dan nomor absen saja tidak membuka jawaban dari sesi lain.

Saat masuk, aplikasi membaca ulang dokumen milik sesi login siswa dan rekaman yang telah dihubungkan dengan kode akses dari server. Pencocokan nama/kelas mengabaikan kapitalisasi, spasi berlebih, serta variasi Unicode. Jika ada rekaman duplikat yang dapat diakses, aplikasi memilih rekaman dengan pos selesai paling banyak, kemudian jawaban terisi paling banyak, kemudian pembaruan terbaru. Kegagalan pencarian server tidak membuat rekaman pengganti kosong. Pencarian identitas hanya mencakup rekaman milik sesi atau yang telah dibuka menggunakan kode akses.

### Melanjutkan di browser lain

1. Pada peta siswa, salin **Kode akses siswa**. Kode dibuat acak dan tersimpan di Firebase. Jika browser lama tidak tersedia, guru membuka **Rekap Siswa → Kode Akses** pada rekaman yang berisi jawaban lama. Jika ada duplikat, pilih rekaman yang progres/jawabannya sesuai.
2. Pada browser baru, gunakan **Lanjutkan dengan kode akses → Buka Jawaban Sebelumnya**. Aplikasi memberi sesi baru akses ke ID rekaman yang sama, tanpa mengubah `ownerUid`, jawaban, tanggal, atau membuat siswa pengganti. Setelah tersambung, pencarian identitas dalam browser tersebut juga mencakup rekaman yang sudah dihubungkan.
3. Kode berfungsi seperti kata sandi: pemegangnya dapat melihat, melanjutkan, dan mereset jawaban pada rekaman itu. Jangan membagikannya kepada siswa lain. Guru dapat memakai **Ganti Kode** untuk membatalkan kode lama dan akses browser yang diperoleh melalui kode lama; browser pemilik asli tetap memiliki akses.

Aturan akses tambahan berada di `studentAccessKeys`, `studentAccessCodes`, dan `studentBrowserAccess/{uid}/students`. Daftar kode/kunci hanya dapat dibaca guru/admin untuk ekspor; siswa hanya dapat memakai kode lengkap atau membaca kunci pada rekaman yang sudah dapat diakses. Kunci hanya diterbitkan untuk pemilik, browser yang sudah diberi akses, atau guru. Browser baru tidak bisa mengganti pemilik atau identitas siswa. Kode salah/tidak berlaku dan kegagalan server tidak membuat entri baru. Jawaban tetap hanya dibaca dari server Firebase. Terapkan `firestore.rules` sebelum menerbitkan perubahan antarmuka.

Backup JSON versi 2 mencakup kode akses yang sudah diterbitkan dan pemetaan kode ke ID siswa. CSV memiliki kolom **Kode Akses Siswa**, atau **Belum dibuat** jika rekaman belum memiliki kode. Backup/CSV membaca kode dari Firebase tanpa membuat atau menggantinya saat ekspor. Untuk menerbitkan kode yang belum tersedia, guru membuka **Kode Akses** pada baris siswa. Simpan berkas ekspor untuk pengelola karena pemegang kode dapat membuka jawaban. Izin sesi browser dan akun Firebase Authentication tidak dicadangkan; siswa dapat memasukkan kode hasil restore pada browser baru. Pengujian aturan tanpa deployment tersedia melalui `node scripts/test-student-access-rules.cjs PATH_TO_FIREBASE_TOOLS_LIB_AUTH_JS`; script memakai akun CLI yang sudah login dan dokumen simulasi melalui [Firebase Rules API test](https://firebase.google.com/docs/reference/rules/rest/v1/projects/test), tanpa menyentuh data siswa.

## Cara kerja data

- Urutan Etape 2: Pos 5 **Melihat kembali usaha saya**, Pos 6 **Saat saya dikritik**, Pos 7 **Belajar dari orang lain**, dan Pos 8 **Komitmen dan target saya**. Jawaban lama yang sudah ada di Firebase dikenali berdasarkan pertanyaannya agar tetap masuk ke pos yang sesuai.
- Pos 8 memisahkan skala percaya diri sesudah layanan dari skala keyakinan terhadap perubahan diri ke depan. Jawaban lama tidak otomatis mengisi skala baru; siswa dapat melengkapinya dengan membuka kembali Pos 8.
- Identitas, jawaban, pengaturan kelas, dan akses pos berasal dari server Firestore. Snapshot dari cache tidak digunakan sebagai sumber data. Formulir yang belum disimpan hanya berada dalam memori halaman; tekan Simpan & Tuntaskan sebelum menutupnya.
- Dashboard guru membaca jawaban dari semua perangkat melalui Firestore. Guru dan admin masuk dengan nama pengguna serta kata sandi; di belakang layar Firebase Authentication memakai alamat internal acak. Firestore Rules membatasi akses sesuai peran.
- Opsi **Akses Pos** berlaku untuk semua perangkat. Standarnya Pos 5 terbuka tujuh hari setelah Pos 4; guru dapat mengizinkan akses lebih awal.
- Penyimpanan jawaban memakai transaksi yang membaca dokumen terbaru di server. Perubahan pos lain dipertahankan; jika pos yang sama berubah sejak formulir dibuka, penyimpanan ditolak agar jawaban terbaru tidak tertimpa.

## Hasil dan Google Drive

Tombol **Unduh CSV** di dashboard guru/admin membaca ulang data server Firebase dan mengekspor semua siswa dari semua kelas, tanpa dibatasi pencarian/filter dashboard. Setiap siswa mendapat satu baris berisi identitas lengkap, kode akses, ID dokumen/pemilik, skor percaya diri, jumlah pos yang benar-benar selesai, pos aktif, tanggal, status dan tanggal penyelesaian setiap pos, serta kolom jawaban seluruh pertanyaan Pos 1–8. Pertanyaan lama yang masih tersimpan ikut muncul sebagai kolom tambahan. Urutan pos lama dipetakan ke urutan saat ini; kolom terakhir berisi JSON asli dokumen siswa agar seluruh field asli tetap tersedia. Jawaban pada pos yang belum selesai tetap diekspor. CSV memakai UTF-8 dengan BOM, mempertahankan tanda kutip/baris baru, dan memberi awalan apostrof pada teks yang dapat dibaca spreadsheet sebagai formula. Nama berkas menggunakan waktu WIB. Jika pembacaan server gagal, unduhan tidak dibuat.

Pada dashboard guru/admin, buka **Rekap Siswa → Backup Data** untuk mengunduh backup JSON. Data dibaca ulang dari server Firebase dan mencakup semua siswa (termasuk yang tidak sesuai filter), identitas, seluruh jawaban, progres, tanggal, ID dokumen, `ownerUid`, pengaturan `settings/public`, serta pasangan `studentAccessKeys`/`studentAccessCodes` yang aktif untuk siswa tersebut. Kode milik rekaman yang sudah dihapus tidak diekspor. Berkas juga memuat versi format, proyek asal, waktu ekspor, jumlah kode akses, serta definisi pertanyaan. Nama berkas memakai tanggal dan waktu WIB. Jika pembacaan siswa, pengaturan, atau kode gagal/tidak cocok, tidak ada backup sebagian yang dibuat.

Backup mencadangkan data siswa, kode akses, dan pengaturan aplikasi. Akun/kata sandi Firebase Authentication, konfigurasi akun staf, dan Firestore Rules tetap dikelola terpisah. Dokumen disimpan sesuai isi asli server, sehingga penomoran pos lama tetap dapat dipetakan saat dipulihkan. Dokumen pengaturan yang belum ada tidak dibuat saat backup; nilai pengaturan bawaan dicatat terpisah. Backup tidak mengubah database dan tidak otomatis mengimpor data. Gunakan **Restore Backup** untuk memilih JSON tersebut, meninjau jumlah siswa yang ditambahkan/diganti dan kode yang dipulihkan, lalu ketik **RESTORE** dan klik **Terapkan Restore**. Restore menerima versi 1 dan 2 dari proyek Firebase yang sama, mempertahankan ID dan ownerUid asli, memulihkan pengaturan jika tersedia, dan menjaga siswa di luar backup. Versi 1 mempertahankan kode yang masih ada. Versi 2 memulihkan kode cadangan bersama jawaban pada transaksi yang sama untuk setiap siswa, termasuk saat metadata kode sebelumnya hilang. Jika kode terbaru berbeda, indeks kode terbaru dihapus; kode cadangan berlaku kembali. Pemegang kode cadangan dapat memperoleh akses kembali. Kode yang sudah dipakai siswa lain atau pasangan kode yang tidak lengkap ditolak. Kelompok transaksi tidak memisahkan siswa dari kode aksesnya; kegagalan kelompok berikutnya tetap melaporkan kelompok yang sudah selesai. Penghapusan per siswa/Hapus Semua turut menghapus kunci dan indeks kodenya. Akun login anonim yang sudah hilang tidak dibuat ulang oleh restore. Pembacaan manual dilakukan selama ekspor, sehingga siswa/pengaturan/kode dapat berasal dari waktu pembacaan yang berbeda; pemetaan kode yang berubah saat ekspor menyebabkan ekspor dibatalkan.

Siswa dan guru dapat memilih **Cetak / Simpan PDF** pada halaman hasil. Browser membuka dialog cetak; pilih tujuan **Save as PDF**. Hasil berisi sampul dan hanya pos yang sudah selesai diisi. Jawaban panjang dapat menambah halaman PDF agar teks tidak terpotong.

PDF dibuat di browser dari jawaban Firebase yang sudah dimuat dan tidak diunggah ke Firebase. Backup otomatis Google Drive mengambil data dari server Firebase, tanpa membaca data lokal/browser.

### Backup otomatis setelah Pos 4 dan Pos 8

Di **Pengaturan Drive**, simpan folder tujuan. Siswa yang menyelesaikan Pos 1–4 atau Pos 1–8 akan memicu backup **seluruh data siswa dari semua kelas, kode akses yang sudah dibuat, dan pengaturan `settings/public`**. Menyimpan ulang Pos 4/8 yang lengkap juga membuat backup baru. Format JSON versi 2 sama dengan Backup Data dan dapat digunakan pada Restore Backup; cadangan versi 1 tetap didukung. Akun login, izin sesi browser, konfigurasi staf, aturan, antrean, dan konfigurasi koneksi Drive tidak termasuk isi backup. Untuk memasukkan kode akses dalam backup otomatis, pemroses Apps Script harus memakai skrip unduhan terbaru. Dashboard memberi petunjuk pembaruan jika pemroses yang terhubung masih memakai format lama.

Jawaban dan permintaan `driveBackupJobs` disimpan dalam satu transaksi Firestore, sehingga antrean tetap tersedia setelah halaman siswa ditutup. Permintaan tidak memuat jawaban maupun token akun. Pemroses Google Apps Script membaca semua halaman koleksi siswa dan pengaturan dengan `readTime` yang sama, sesuai createTime dokumen antrean (waktu commit transaksi). Field createdAt digunakan untuk urutan antrean; presisi milidetik serverTimestamp tidak digunakan sebagai readTime. ID, ownerUid, jawaban, dan penomoran asli dipertahankan. Berkas diberi nama unik per permintaan; backup lama tidak ditimpa. Status **Berhasil** dicatat hanya sesudah berkas tersimpan di Drive. Jika pencatatan status gagal, percobaan ulang memakai berkas yang sama. Kegagalan pembacaan Firebase tidak membuat berkas sebagian.

Pemasangan awal (sekali, memakai akun Google yang memiliki akses pengelola Firebase dan akses tulis folder):

1. Terapkan aturan dan indeks: `firebase deploy --only firestore --project growth-mindset-percaya-diri`.
2. Simpan folder tujuan pada dashboard, dengan backup otomatis belum diaktifkan.
3. Pada Google Apps Script, buat proyek khusus pemroses backup. Unduh skrip dan manifest dari **Pengaturan Drive**. Isi Code.gs dengan skrip tersebut. Aktifkan tampilan manifest melalui pengaturan proyek, lalu isi appsscript.json dengan manifest unduhan. Build menyertakan ID proyek, definisi pertanyaan, serta pengaturan bawaan yang sesuai aplikasi. Untuk proyek Apps Script yang sudah ada, gunakan unduhan terbaru dan perbarui manifest. Pemroses ini menggantikan webhook lama, tanpa endpoint publik.
4. Jalankan `installBackupTrigger` satu kali, lalu berikan izin Google. Fungsi memeriksa akses Firebase/folder, memasang trigger tiap menit tanpa menduplikasi trigger, serta mencatat status pemeriksaan ke Firebase. Jangan menyalin token atau kata sandi ke skrip.
5. Setelah dashboard menampilkan pemroses terhubung tanpa kesalahan, aktifkan backup otomatis. Antrean dan 100 permintaan terbaru terlihat pada dashboard. Cadangan pertama yang berhasil memberi tautan berkas. Pemasangan trigger dan izin Google diperlukan; deployment frontend saja belum mengaktifkan pengiriman.

Antrean diproses sekitar setiap menit; keterlambatan, kuota Apps Script/Firestore/Drive, kapasitas folder, atau gangguan akses dapat menunda/gagalkan pemrosesan. Menonaktifkan backup menghentikan permintaan baru dan menunda pemrosesan antrean. Database saat ini memiliki retensi versi satu jam tanpa PITR; snapshot yang belum berhasil diekspor selama lebih dari satu jam ditandai **kedaluwarsa**, tanpa menggantinya diam-diam dengan data terbaru. Cadangan yang sudah tersimpan tetap tersedia di Drive. Gunakan Backup Data untuk cadangan keadaan saat ini jika pemroses terputus, dan periksa statusnya sebelum menghapus data. Batas pembacaan historis mengikuti [Firestore REST readTime](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/list); trigger berjalan di akun pemasang sesuai [dokumentasi Apps Script](https://developers.google.com/apps-script/guides/triggers/installable).

Jawaban lama yang sudah terimpor di Firebase tetap dipertahankan. Perubahan ini tidak memulihkan jawaban yang sebelumnya terhapus atau tertimpa.

## Struktur

- `src/data.ts`: definisi pertanyaan delapan pos.
- `src/context.tsx`: kontrak context bersama tanpa penyimpanan lokal.
- `src/cloud-context.tsx`: sesi anonim siswa, akun staf, pembacaan server, dan transaksi Firestore.
- `src/components/StaffAccountsPanel.tsx`: pembuatan admin, pembuatan akun guru, serta pengaturan akses dan kata sandi staf.
- `src/firebase.ts`, `src/firebase-config.ts`, dan `firestore.rules`: koneksi serta aturan akses Firebase.
- `src/components/StudentEntry.tsx`: formulir identitas.
- `src/components/JourneyMap.tsx` dan `StageModal.tsx`: progres dan pengisian pos.
- `src/components/ResultView.tsx`: hasil dan cetak PDF.
- `src/components/AdminDashboard.tsx`: rekap data siswa.

Skor percaya diri pada rekap memakai skala sesudah layanan di Pos 8 jika sudah diisi, atau skala awal di Pos 1. Skala keyakinan terhadap perubahan diri ke depan tidak digunakan sebagai skor percaya diri.

**Hapus Semua Data Siswa** membaca seluruh siswa dari server, menampilkan jumlah di semua kelas, dan memerlukan ketikan **HAPUS SEMUA** sebelum dijalankan. Yang dihapus hanya dokumen siswa dan jawabannya; akun guru/admin serta pengaturan tetap ada. Data yang baru dibuat setelah ringkasan tidak termasuk. Restore dan penghapusan dilakukan dalam kelompok transaksi; data yang berubah sejak ringkasan menyebabkan kelompok tersebut dibatalkan. Jika koneksi/izin gagal di tengah operasi besar, kelompok yang sudah berhasil tetap diterapkan dan jumlah dokumen yang selesai ditampilkan. Buat ringkasan baru untuk melanjutkan. Jangan tutup halaman selama operasi.

Restore memerlukan Firestore Rules terbaru yang mengizinkan guru/admin membuat kembali dokumen siswa dengan format yang sesuai. Terapkan `firestore.rules` sebelum menggunakan restore pada data yang sudah terhapus.
