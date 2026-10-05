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

Data siswa dan pengaturan hanya dibaca dari Firebase. Impor otomatis data browser dan pembacaan draf lokal sudah dihapus. Sesi login anonim Firebase tetap melekat pada browser/perangkat; menghapus sesi login atau mengganti perangkat dapat membuat siswa kehilangan akses ke jawabannya, tetapi tidak menghapus jawaban di server. Nama, kelas, dan nomor absen bukan bukti identitas.

## Cara kerja data

- Urutan Etape 2: Pos 5 **Melihat kembali usaha saya**, Pos 6 **Saat saya dikritik**, Pos 7 **Belajar dari orang lain**, dan Pos 8 **Komitmen dan target saya**. Jawaban lama yang sudah ada di Firebase dikenali berdasarkan pertanyaannya agar tetap masuk ke pos yang sesuai.
- Pos 8 memisahkan skala percaya diri sesudah layanan dari skala keyakinan terhadap perubahan diri ke depan. Jawaban lama tidak otomatis mengisi skala baru; siswa dapat melengkapinya dengan membuka kembali Pos 8.
- Identitas, jawaban, pengaturan kelas, dan akses pos berasal dari server Firestore. Snapshot dari cache tidak digunakan sebagai sumber data. Formulir yang belum disimpan hanya berada dalam memori halaman; tekan Simpan & Tuntaskan sebelum menutupnya.
- Dashboard guru membaca jawaban dari semua perangkat melalui Firestore. Guru dan admin masuk dengan nama pengguna serta kata sandi; di belakang layar Firebase Authentication memakai alamat internal acak. Firestore Rules membatasi akses sesuai peran.
- Opsi **Akses Pos** berlaku untuk semua perangkat. Standarnya Pos 5 terbuka tujuh hari setelah Pos 4; guru dapat mengizinkan akses lebih awal.
- Penyimpanan jawaban memakai transaksi yang membaca dokumen terbaru di server. Perubahan pos lain dipertahankan; jika pos yang sama berubah sejak formulir dibuka, penyimpanan ditolak agar jawaban terbaru tidak tertimpa.

## Hasil dan Google Drive

Siswa dan guru dapat memilih **Cetak / Simpan PDF** pada halaman hasil. Browser membuka dialog cetak; pilih tujuan **Save as PDF**. Hasil berisi sampul dan hanya pos yang sudah selesai diisi. Jawaban panjang dapat menambah halaman PDF agar teks tidak terpotong.

PDF dibuat di browser dari jawaban Firebase yang sudah dimuat dan tidak diunggah ke Firebase. Sinkronisasi data lokal ke Google Drive sudah tidak digunakan.

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
