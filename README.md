# Growth Mindset Journey Map Percaya Diri

Web refleksi untuk layanan bimbingan klasikal kelas X. Siswa mengisi delapan pos dalam dua etape. Pos 5 terbuka tujuh hari setelah pos 4 disimpan.

## Menjalankan

```bash
npm ci
npm run dev
npm run build
npm test
```

Build Vite dapat diterbitkan melalui workflow GitHub Pages di `.github/workflows/deploy.yml`.

## Cara kerja data

- Identitas siswa, jawaban, pengaturan kelas, dan kredensial guru disimpan di `localStorage` browser yang sedang dipakai. Draf pos juga tersimpan di browser itu.
- Dashboard guru hanya menampilkan siswa yang mengisi di browser yang sama. Data tidak otomatis berpindah antara HP siswa dan laptop guru.
- Login guru pada versi statis adalah kontrol antarmuka lokal, bukan autentikasi server. Jangan gunakan untuk data sensitif yang membutuhkan pembatasan akses nyata.
- Bila penyimpanan browser dibersihkan, data lokal hilang. Unduh hasil PDF sebelum membersihkan data.

## Hasil dan Google Drive

Siswa dan guru dapat memilih **Cetak / Simpan PDF** pada halaman hasil. Browser membuka dialog cetak; pilih tujuan **Save as PDF**. Hasil berisi sampul dan hanya pos yang sudah selesai diisi (maksimal sembilan halaman), bukan berkas `.pptx`.

Opsional: `google-apps-script-sync.js` dapat diterbitkan sebagai Google Apps Script Web App. Atur `FOLDER_ID` di skrip ke folder milik guru. Agar semua perangkat siswa mengirim ke endpoint yang sama, isi GitHub Actions repository variable `DRIVE_WEBHOOK_URL` dengan URL `/exec`, kemudian deploy ulang. URL ini akan tertanam dalam build publik. URL yang diatur lewat dashboard hanya berlaku pada browser tersebut. Setelah delapan pos selesai, frontend mencoba mengirim JSON. Google Apps Script memakai respons lintas origin yang tidak dapat diverifikasi dari halaman GitHub Pages; status **Dikirim, cek di Drive** berarti pengiriman telah dicoba, bukan konfirmasi file sudah ada. Periksa folder Drive secara langsung. Link folder di dashboard hanya referensi lokal; tujuan sebenarnya ditentukan oleh `FOLDER_ID` di skrip.

Untuk rekap lintas perangkat, autentikasi guru yang aman, serta konfirmasi sinkronisasi, aplikasi memerlukan backend bersama. GitHub Pages saja tidak menyediakan komponen tersebut. Jangan menerbitkan data refleksi pribadi siswa dengan mengandalkan login lokal ini.

## Struktur

- `src/data.ts`: definisi pertanyaan delapan pos.
- `src/context.tsx`: state dan penyimpanan lokal.
- `src/components/StudentEntry.tsx`: formulir identitas.
- `src/components/JourneyMap.tsx` dan `StageModal.tsx`: progres dan pengisian pos.
- `src/components/ResultView.tsx`: hasil dan cetak PDF.
- `src/components/AdminDashboard.tsx`: rekap data di browser setempat.
