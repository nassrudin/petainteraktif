# Growth Mindset Journey Map Percaya Diri

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

Tanpa konfigurasi Firebase, aplikasi tetap berjalan dalam mode lokal lama untuk uji coba. Mode lokal tidak cocok untuk mengumpulkan jawaban pribadi seluruh kelas karena data dan login guru hanya ada pada browser tersebut.

1. Buat proyek paket Spark di [Firebase Console](https://console.firebase.google.com/), lalu daftarkan aplikasi Web. Salin `apiKey`, `authDomain`, `projectId`, dan `appId` dari konfigurasi Web ke `.env` lokal berdasarkan [.env.example](.env.example).
2. Di **Authentication → Sign-in method**, aktifkan **Anonymous** untuk siswa dan **Google** untuk guru. Tambahkan `nassrudin.github.io` di **Authentication → Settings → Authorized domains**. Guru masuk memakai akun Google `andy.wbowo@gmail.com`; email itu tidak perlu didaftarkan sebagai akun baru.
3. Buat database **Cloud Firestore**. Terapkan [firestore.rules](firestore.rules) sebelum memasukkan jawaban sungguhan: tempel aturan di **Firestore Database → Rules**, lalu **Publish**. Alternatif Firebase CLI: `firebase deploy --only firestore:rules --project PROJECT_ID`. Aturan membatasi siswa ke data miliknya dan hanya akun Google guru tersebut dapat membaca seluruh rekap atau mengubah pengaturan.
4. Di repositori GitHub, buka **Settings → Secrets and variables → Actions → Variables**. Tambahkan `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, dan `FIREBASE_APP_ID` dari konfigurasi Web. Workflow memasukkannya ke build sebagai `VITE_FIREBASE_*`. Nilai konfigurasi Web terlihat di browser; keamanan jawaban bergantung pada Authentication dan Firestore Rules.
5. Jalankan ulang workflow **Deploy to GitHub Pages**. Uji di dua browser: isi satu pos sebagai siswa pada browser pertama, lalu masuk Google sebagai guru pada browser kedua dan pastikan jawaban muncul. Coba akun Google lain untuk memastikan akses guru ditolak.

Saat Firebase pertama kali aktif di suatu browser, data siswa lama yang tersimpan di browser itu dicoba diimpor satu kali tanpa menghapus salinan lokal. Perangkat lain perlu membuka situs lagi agar data lokalnya ikut diimpor. Siswa memakai sesi anonim yang melekat pada browser/perangkat; jika penyimpanan browser dihapus atau perangkat diganti, siswa tidak dapat melanjutkan jawaban lama. Nama, kelas, dan nomor absen yang diketik siswa bukan bukti identitas, sehingga guru perlu memeriksa entri ganda.

## Cara kerja data

- Dalam mode Firebase, identitas siswa, jawaban, serta pengaturan kelas dan akses pos disimpan di Firestore. Draf yang belum dikirim dan penanda siswa aktif tetap disimpan di browser.
- Dashboard guru membaca jawaban dari semua perangkat melalui Firestore. Login guru memakai Firebase Authentication dengan Google; aturan Firestore membatasi akses data.
- Opsi **Akses Pos** berlaku untuk semua perangkat. Standarnya Pos 5 terbuka tujuh hari setelah Pos 4; guru dapat mengizinkan akses lebih awal.
- Dalam mode lokal tanpa Firebase, data dan kredensial guru tetap disimpan di `localStorage` seperti versi sebelumnya. Dashboard lokal hanya melihat data di browser itu.

## Hasil dan Google Drive

Siswa dan guru dapat memilih **Cetak / Simpan PDF** pada halaman hasil. Browser membuka dialog cetak; pilih tujuan **Save as PDF**. Hasil berisi sampul dan hanya pos yang sudah selesai diisi. Jawaban panjang dapat menambah halaman PDF agar teks tidak terpotong.

PDF dibuat di browser dan tidak diunggah ke Firebase. Dalam mode Firebase, jawaban tersimpan dan dibaca dari Firestore sehingga fitur sinkronisasi Google Drive disembunyikan. Dalam mode lokal lama, `google-apps-script-sync.js` masih dapat dipakai sebagai opsi pengiriman ke Drive.

Jangan menerbitkan data refleksi pribadi siswa dengan hanya mengandalkan login lokal. Aktifkan Firebase dan terapkan aturan akses sebelum penggunaan kelas.

## Struktur

- `src/data.ts`: definisi pertanyaan delapan pos.
- `src/context.tsx`: state dan penyimpanan lokal.
- `src/cloud-context.tsx`: sesi anonim siswa, login Google guru, migrasi data lama, dan sinkronisasi Firestore.
- `src/firebase.ts`, `src/firebase-config.ts`, dan `firestore.rules`: koneksi serta aturan akses Firebase.
- `src/components/StudentEntry.tsx`: formulir identitas.
- `src/components/JourneyMap.tsx` dan `StageModal.tsx`: progres dan pengisian pos.
- `src/components/ResultView.tsx`: hasil dan cetak PDF.
- `src/components/AdminDashboard.tsx`: rekap data siswa.
