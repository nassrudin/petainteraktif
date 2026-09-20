import { StageDefinition, ActiveStudent, StudentJourney, AdminCredentials } from './types';

export const STAGES_DATA: StageDefinition[] = [
  {
    id: 1,
    title: 'Mengenali Diri & Percaya Diri',
    subtitle: 'Tahap Awal Petualangan: Kenali potensi terbaikmu',
    theme: 'Lembah Pengenalan Diri',
    islandName: 'Puncak Percaya Diri',
    meetingPhase: 1,
    color: 'emerald',
    badgeName: 'Berani Memulai',
    badgeIcon: 'Compass',
    missionDescription:
      'Misi pertamamu adalah memetakan kelebihan diri, hal yang membuatmu bangga, dan seberapa yakin dirimu bisa berkembang.',
    motivationalQuote: 'Setiap langkah besar bermula dari keberanian memercayai potensi diri sendiri.',
    fields: [
      {
        id: 'strength',
        label: 'Sebutkan 2 atau 3 kelebihan/bakat yang kamu miliki saat ini:',
        type: 'textarea',
        placeholder: 'Contoh: Saya pantang menyerah saat matematika, suka mendengarkan cerita teman...',
      },
      {
        id: 'confidence_level',
        label: 'Tingkat Kepercayaan Dirimu untuk Menghadapi Hal Baru (1 - 10):',
        type: 'slider',
        min: 1,
        max: 10,
        step: 1,
        helperText: 'Geser slider untuk menentukan skor keyakinanmu.',
      },
      {
        id: 'self_motto',
        label: 'Kalimat afirmasi/motto positif penyemangatmu:',
        type: 'text',
        placeholder: 'Contoh: Saya mungkin belum bisa hari ini, tapi besok saya akan lebih paham!',
      },
    ],
  },
  {
    id: 2,
    title: 'Menentukan Tantangan',
    subtitle: 'Menetapkan target berani yang ingin kamu taklukkan',
    theme: 'Hutan Belantara Target',
    islandName: 'Tebing Tantangan',
    meetingPhase: 1,
    color: 'teal',
    badgeName: 'Penakluk Rintangan',
    badgeIcon: 'Mountain',
    missionDescription:
      'Pilihlah satu tantangan nyata dalam belajar atau kegiatan sekolah yang selama ini terasa sulit atau sering kamu hindari.',
    motivationalQuote: 'Tantangan bukan dinding penghalang, melainkan tangga menuju versi dirimu yang lebih kuat.',
    fields: [
      {
        id: 'target_subject',
        label: 'Area/Pelajaran apa yang menjadi target tantangan terbesarmu?',
        type: 'text',
        placeholder: 'Contoh: Presentasi di depan kelas / Ujian Matematika Bab Aljabar...',
      },
      {
        id: 'why_challenge',
        label: 'Mengapa hal ini menantang bagimu?',
        type: 'textarea',
        placeholder: 'Jelaskan perasaan dan apa yang biasanya membuatmu merasa ragu...',
      },
      {
        id: 'success_indicator',
        label: 'Tanda keberhasilan yang ingin kamu capai:',
        type: 'textarea',
        placeholder: 'Contoh: Mampu berbicara lancar 3 menit tanpa gemetar atau dapat nilai minimal 80...',
      },
    ],
  },
  {
    id: 3,
    title: 'Mengidentifikasi Hambatan',
    subtitle: 'Memetakan monster keraguan dan distraksi',
    theme: 'Rawa-Rawa Keraguan',
    islandName: 'Goa Pembuka Rahasia',
    meetingPhase: 1,
    color: 'sky',
    badgeName: 'Mata Elang',
    badgeIcon: 'Eye',
    missionDescription:
      'Untuk mengalahkan musuh, kita harus mengenalnya. Apa saja rintangan internal dan eksternal yang sering menghambatmu?',
    motivationalQuote: 'Menyadari hambatan adalah setengah jalan dari menemukan jalan keluar.',
    fields: [
      {
        id: 'internal_obstacles',
        label: 'Hambatan dari dalam diri yang paling sering muncul (pilih yang sesuai):',
        type: 'checklist',
        options: [
          'Takut salah atau ditertawakan teman',
          'Suka menunda-nunda pekerjaan (Prokrastinasi)',
          'Cepat bosan saat materi sulit',
          'Merasa kurang pintar dibanding orang lain',
          'Kurang disiplin membagi waktu gadget vs belajar',
        ],
      },
      {
        id: 'biggest_barrier_note',
        label: 'Jelaskan secara spesifik kapan hambatan tersebut paling kuat kamu rasakan:',
        type: 'textarea',
        placeholder: 'Tuliskan momen ketika kamu merasa ingin menyerah...',
      },
    ],
  },
  {
    id: 4,
    title: 'Menentukan Langkah Kecil',
    subtitle: 'Prinsip 1% lebih baik setiap hari (Micro-steps)',
    theme: 'Jembatan Langkah Emas',
    islandName: 'Pondok Rencana Aksi',
    meetingPhase: 1,
    color: 'blue',
    badgeName: 'Arsitek Aksi',
    badgeIcon: 'Footprints',
    missionDescription:
      'Perubahan besar dibentuk dari langkah kecil yang konsisten. Apa saja 3 aksi nyata yang bisa kamu mulai hari ini?',
    motivationalQuote: 'Kamu tidak perlu melihat seluruh anak tangga, cukup ambil langkah pertama.',
    fields: [
      {
        id: 'step_1',
        label: 'Langkah Kecil 1 (Dapat dilakukan hari ini/besok):',
        type: 'text',
        placeholder: 'Contoh: Membaca rangkuman 15 menit setiap malam sebelum tidur...',
      },
      {
        id: 'step_2',
        label: 'Langkah Kecil 2 (Dilakukan konsisten pekan ini):',
        type: 'text',
        placeholder: 'Contoh: Membuat catatan warna-warni dan latihan 3 soal per hari...',
      },
      {
        id: 'step_3',
        label: 'Langkah Kecil 3 (Mencari bantuan/diskusi):',
        type: 'text',
        placeholder: 'Contoh: Bertanya ke guru atau teman kelompok jika ada yang membingungkan...',
      },
    ],
  },
  {
    id: 5,
    title: 'Mengelola Kritik & Masukan',
    subtitle: 'Mengubah umpan balik menjadi bahan bakar pertumbuhan',
    theme: 'Air Terjun Kejernihan',
    islandName: 'Kuil Umpan Balik',
    meetingPhase: 2,
    color: 'indigo',
    badgeName: 'Hati Terbuka',
    badgeIcon: 'ShieldCheck',
    missionDescription:
      'Kritik konstruktif sering kali terasa pahit, namun itulah cermin yang memandu kita menjadi lebih mahir.',
    motivationalQuote: 'Kritik bukan penilaian harga dirimu, melainkan petunjuk arah menuju karya yang lebih baik.',
    fields: [
      {
        id: 'past_criticism',
        label: 'Kritik atau masukan apa yang pernah kamu terima dari guru/teman yang awalnya membuatmu sedih atau kesal?',
        type: 'textarea',
        placeholder: 'Tuliskan pengalaman tersebut...',
      },
      {
        id: 'positive_reframing',
        label: 'Bagaimana cara kamu memandang masukan tersebut dengan kacamata Growth Mindset sekarang?',
        type: 'textarea',
        placeholder: 'Contoh: Mereka mengkritik tulisanku bukan membenciku, tapi ingin idenya tersampaikan jelas...',
      },
    ],
  },
  {
    id: 6,
    title: 'Belajar dari Orang Lain',
    subtitle: 'Inspirasi dari role model dan teman seperjuangan',
    theme: 'Desa Para Sahabat Bijak',
    islandName: 'Pustaka Inspirasi',
    meetingPhase: 2,
    color: 'violet',
    badgeName: 'Pembelajar Aktif',
    badgeIcon: 'Users',
    missionDescription:
      'Orang yang hebat tidak bersaing dengan rasa iri, melainkan mempelajari strategi di balik keberhasilan orang lain.',
    motivationalQuote: 'Ketika melihat orang lain berhasil, tanyakan: "Strategi apa yang bisa saya pelajari darinya?"',
    fields: [
      {
        id: 'role_model_name',
        label: 'Siapa sosok (teman, tokoh, atau guru) yang kamu kagumi ketekunannya?',
        type: 'text',
        placeholder: 'Nama sosok inspirasimu...',
      },
      {
        id: 'admired_trait',
        label: 'Kebiasaan atau strategi apa dari mereka yang ingin kamu tiru dalam belajarmu?',
        type: 'textarea',
        placeholder: 'Contoh: Dia selalu membuat jadwal harian dan tetap tenang saat belum paham materi...',
      },
    ],
  },
  {
    id: 7,
    title: 'Melakukan Refleksi Usaha',
    subtitle: 'Menghargai proses, bukan hanya hasil akhir',
    theme: 'Cermin Keheningan Bintang',
    islandName: 'Menara Refleksi',
    meetingPhase: 2,
    color: 'purple',
    badgeName: 'Penghargai Proses',
    badgeIcon: 'Sparkles',
    missionDescription:
      'Refleksikan seberapa besar energimu telah dicurahkan. Hasil mungkin butuh waktu, namun usahamu sudah nyata.',
    motivationalQuote: 'Bukan kecerdasan awal yang menentukan masa depanmu, melainkan daya tahan usahamu.',
    fields: [
      {
        id: 'effort_score',
        label: 'Berapa nilai usahamu selama 2 pekan terakhir (Skala 1 - 10)?',
        type: 'slider',
        min: 1,
        max: 10,
        step: 1,
        helperText: 'Jujurlah pada dirimu sendiri mengenai kesungguhan usahamu.',
      },
      {
        id: 'proud_moment',
        label: 'Momen apa yang paling membuatmu bangga dengan usahamu sendiri akhir-akhir ini?',
        type: 'textarea',
        placeholder: 'Contoh: Saat saya tetap mencoba menyelesaikan 5 soal sulit meski sempat ingin tidur...',
      },
    ],
  },
  {
    id: 8,
    title: 'Membuat Komitmen Perubahan',
    subtitle: 'Deklarasi janji petualang sejati untuk masa depan',
    theme: 'Kuil Penobatan Juara',
    islandName: 'Puncak Growth Mindset',
    meetingPhase: 2,
    color: 'amber',
    badgeName: 'Growth Master',
    badgeIcon: 'Award',
    missionDescription:
      'Selamat! Kamu telah tiba di puncak perjalanan. Tuliskan ikrar komitmen pribadimu yang akan kamu bawa seterusnya.',
    motivationalQuote: 'Saya bukan hasil dari keterbatasan masa lalu saya; saya adalah hasil dari komitmen belajar saya.',
    fields: [
      {
        id: 'pledge_text',
        label: 'Tuliskan ikrar komitmen "Growth Mindset" pribadimu:',
        type: 'textarea',
        placeholder: 'Saya berjanji kepada diri saya sendiri bahwa jika menemui kesulitan, saya akan...',
      },
      {
        id: 'daily_habit',
        label: 'Satu kebiasaan baru yang kamu komitmenkan untuk dilakukan setiap hari:',
        type: 'text',
        placeholder: 'Contoh: Mengulang pelajaran 20 menit dan tidak takut bertanya...',
      },
      {
        id: 'signature_agreement',
        label: 'Pernyataan kesungguhan:',
        type: 'radio',
        options: [
          'Saya siap menjalankan komitmen ini dengan sungguh-sungguh demi masa depan saya!',
          'Saya bertekad untuk terus bertumbuh dan pantang menyerah.',
        ],
      },
    ],
  },
];

export const DEFAULT_ADMIN: AdminCredentials = {
  username: 'admin',
  password: 'admin123',
  name: 'Guru Pembimbing BK',
};

export const INITIAL_STUDENTS: ActiveStudent[] = [
  {
    id: 'student-1',
    name: 'Budi Santoso',
    class: 'X-1',
    startedAt: '2026-09-15 08:00',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'student-2',
    name: 'Siti Rahma',
    class: 'X-1',
    startedAt: '2026-09-10 08:30',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'student-3',
    name: 'Dimas Pratama',
    class: 'X-2',
    startedAt: '2026-09-18 09:00',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'student-4',
    name: 'Aisyah Putri',
    class: 'X-2',
    startedAt: '2026-09-18 09:45',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80',
  },
];

export const INITIAL_JOURNEYS: Record<string, StudentJourney> = {
  'student-1': {
    studentId: 'student-1',
    studentName: 'Budi Santoso',
    studentClass: 'X-1',
    confidenceScore: 85,
    lastActiveStage: 4,
    updatedAt: '2026-09-17 14:00',
    stages: {
      1: {
        completed: true,
        completedAt: '2026-09-15 08:30',
        answers: {
          strength: 'Pantang menyerah saat coding/matematika, teliti memeriksa tugas teman.',
          confidence_level: 8,
          self_motto: 'Belum bisa bukan berarti tidak akan bisa, hanya butuh latihan!',
        },
      },
      2: {
        completed: true,
        completedAt: '2026-09-16 10:15',
        answers: {
          target_subject: 'Presentasi Proyek Sains di Depan Guru Penguji',
          why_challenge: 'Sering merasa grogi, nafas cepat, dan takut salah bicara di depan audiens.',
          success_indicator: 'Berbicara runtut selama 5 menit dengan kontak mata tanpa membaca catatan terus menerus.',
        },
      },
      3: {
        completed: true,
        completedAt: '2026-09-17 14:00',
        answers: {
          internal_obstacles: [
            'Takut salah atau ditertawakan teman',
            'Suka menunda-nunda pekerjaan (Prokrastinasi)',
          ],
          biggest_barrier_note: 'Malam sebelum presentasi suka menunda membuat slide sehingga akhirnya kurang latihan.',
        },
      },
    },
  },
  'student-2': {
    studentId: 'student-2',
    studentName: 'Siti Rahma',
    studentClass: 'X-1',
    confidenceScore: 95,
    lastActiveStage: 8,
    updatedAt: '2026-09-18 11:20',
    driveExportedUrl: 'https://drive.google.com/drive/folders/growth-mindset-journey/X-1/Siti_Rahma.png',
    driveExportedAt: '2026-09-18 11:20',
    stages: {
      1: {
        completed: true,
        completedAt: '2026-09-10 09:00',
        answers: {
          strength: 'Mudah bergaul, kreatif menggambar peta konsep, senang menulis esai.',
          confidence_level: 9,
          self_motto: 'Kesalahan adalah pupuk terbaik bagi tumbuhnya kecerdasan.',
        },
      },
      2: {
        completed: true,
        completedAt: '2026-09-11 09:30',
        answers: {
          target_subject: 'Olimpiade Bahasa Inggris & Pidato',
          why_challenge: 'Kosakata bahasa Inggris akademik masih terbatas.',
          success_indicator: 'Bisa menyelesaikan tes latihan dengan skor di atas 90.',
        },
      },
      3: {
        completed: true,
        completedAt: '2026-09-12 11:00',
        answers: {
          internal_obstacles: ['Kurang disiplin membagi waktu gadget vs belajar'],
          biggest_barrier_note: 'Tergoda melihat notifikasi media sosial saat sedang menghafal kosakata.',
        },
      },
      4: {
        completed: true,
        completedAt: '2026-09-13 13:00',
        answers: {
          step_1: 'Pasang timer belajar 25 menit (Metode Pomodoro) tanpa ponsel.',
          step_2: 'Membaca 1 artikel bahasa Inggris setiap pagi.',
          step_3: 'Latihan dialog dengan teman sebangku 15 menit per hari.',
        },
      },
      5: {
        completed: true,
        completedAt: '2026-09-14 10:20',
        answers: {
          past_criticism: 'Guru mengatakan pengucapan kata aksen saya masih kaku dan salah intonasi.',
          positive_reframing: 'Kritik itu membuat saya tahu persis kata mana yang perlu dilatih ulang di kamus audio.',
        },
      },
      6: {
        completed: true,
        completedAt: '2026-09-15 15:45',
        answers: {
          role_model_name: 'Kak Raisa (Juara Debat Sekolah)',
          admired_trait: 'Dia mencatat setiap kata baru di binder saku dan selalu membacanya saat jeda istirahat.',
        },
      },
      7: {
        completed: true,
        completedAt: '2026-09-16 16:30',
        answers: {
          effort_score: 9,
          proud_moment: 'Berhasil membaca 7 artikel berita bahasa Inggris penuh tanpa menyerah mencari arti kata sulit.',
        },
      },
      8: {
        completed: true,
        completedAt: '2026-09-17 10:00',
        answers: {
          pledge_text: 'Saya Siti Rahma berjanji akan menyambut tantangan baru sebagai kesempatan emas untuk bertumbuh.',
          daily_habit: 'Latihan mendengarkan podcast bahasa Inggris 15 menit setiap bangun tidur.',
          signature_agreement: 'Saya siap menjalankan komitmen ini dengan sungguh-sungguh demi masa depan saya!',
        },
      },
    },
  },
  'student-3': {
    studentId: 'student-3',
    studentName: 'Dimas Pratama',
    studentClass: 'X-2',
    confidenceScore: 60,
    lastActiveStage: 1,
    updatedAt: '2026-09-18 09:10',
    stages: {
      1: {
        completed: true,
        completedAt: '2026-09-18 09:10',
        answers: {
          strength: 'Fisik kuat, suka olahraga basket, cepat akrab dengan teman baru.',
          confidence_level: 6,
          self_motto: 'Latihan keras tidak pernah mengkhianati hasil.',
        },
      },
    },
  },
  'student-4': {
    studentId: 'student-4',
    studentName: 'Aisyah Putri',
    studentClass: 'X-2',
    confidenceScore: 0,
    lastActiveStage: 1,
    updatedAt: '2026-09-18 09:45',
    stages: {},
  },
};
