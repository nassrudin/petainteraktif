import { StageDefinition, ActiveStudent, StudentJourney, AdminCredentials, ClassConfig } from './types';
import { DEFAULT_DRIVE_FOLDER_URL } from './context';
import { sanitizeTextInput } from './utils/security';

export const PEGANGAN_DI_SEPANJANG_JALAN =
  'Percaya diri bukan bakat yang dimiliki sejak lahir. Ia tumbuh setiap kali kamu berani mencoba sekali lagi.';

export const PESAN_UNTUK_DIRI_SAYA =
  'Bukan karena mudah lalu saya berani. Karena saya berani, lama-lama menjadi mudah.';

// Default class configurations: X-1 to X-12 with absence 1-36
export const DEFAULT_CLASS_CONFIGS: ClassConfig[] = Array.from({ length: 12 }, (_, i) => ({
  className: `X-${i + 1}`,
  absentRangeMin: 1,
  absentRangeMax: 36,
}));

export const STAGES_DATA: StageDefinition[] = [
  {
    id: 1,
    title: 'Potret percaya diri saya',
    subtitle: 'Titik mulai',
    sectionTag: 'Titik mulai',
    etapeNumber: 1,
    etapeTitle: 'Etape 1: Mengenali diri dan menghadapi tantangan',
    theme: 'Lembah Pengenalan Diri',
    islandName: 'Puncak Percaya Diri',
    meetingPhase: 1,
    color: 'emerald',
    badgeName: 'Berani Memulai',
    badgeIcon: 'Compass',
    missionDescription:
      'Petakan situasi di mana kamu merasa kurang percaya diri, apa yang kamu pikirkan, rasakan, dan tindakan yang kamu ambil.',
    motivationalQuote: PEGANGAN_DI_SEPANJANG_JALAN,
    exampleText:
      'Saya tahu jawabannya, tapi tangan saya tidak pernah terangkat saat guru bertanya.',
    fields: [
      {
        id: 'situation',
        label: 'Di situasi apa saya merasa kurang percaya diri?',
        type: 'textarea',
        placeholder: 'Contoh: Saat disuruh berbicara di depan kelas atau saat guru bertanya...',
      },
      {
        id: 'thought',
        sectionHeader: 'Saat situasi itu terjadi:',
        label: 'Saya berpikir:',
        type: 'textarea',
        placeholder: 'Apa yang terlintas dalam pikiranmu...',
      },
      {
        id: 'feeling',
        label: 'Saya merasa:',
        type: 'textarea',
        placeholder: 'Apa yang dirasakan tubuh dan hatimu (deg-degan, takut, dll)...',
      },
      {
        id: 'action',
        label: 'Saya lalu:',
        type: 'textarea',
        placeholder: 'Apa yang akhirnya kamu lakukan saat itu...',
      },
      {
        id: 'confidence_scale',
        label: 'Percaya diri saya hari ini ada di angka:',
        type: 'slider',
        min: 1,
        max: 5,
        step: 1,
        minLabel: 'Belum berani',
        maxLabel: 'Sangat berani',
        helperText: 'Skala 1 (Belum berani) sampai 5 (Sangat berani)',
      },
    ],
  },
  {
    id: 2,
    title: 'Tantangan yang saya pilih',
    subtitle: 'Challenge',
    sectionTag: 'Challenge',
    etapeNumber: 1,
    etapeTitle: 'Etape 1: Mengenali diri dan menghadapi tantangan',
    theme: 'Hutan Belantara Target',
    islandName: 'Tebing Tantangan',
    meetingPhase: 1,
    color: 'teal',
    badgeName: 'Penakluk Rintangan',
    badgeIcon: 'Mountain',
    missionDescription:
      'Pilihlah satu tantangan nyata yang paling ingin kamu taklukkan.',
    motivationalQuote: PESAN_UNTUK_DIRI_SAYA,
    fields: [
      {
        id: 'challenge_target',
        label: 'Satu tantangan yang paling ingin saya taklukkan:',
        type: 'textarea',
        placeholder: 'Tuliskan tantangan belajarmu secara spesifik...',
      },
      {
        id: 'heavy_reason',
        label: 'Apa yang membuat terasa berat?',
        type: 'textarea',
        placeholder: 'Jelaskan mengapa tantangan ini terasa berat bagimu...',
      },
      {
        id: 'tidak_bisa',
        sectionHeader: "Tukar kalimatnya:",
        label: 'Saya tidak bisa : ..............',
        type: 'textarea',
        placeholder: 'Isi dengan pernyataan yang biasanya muncul saat ragu...',
      },
      {
        id: 'belum_bisa',
        label: 'Saya belum bisa : ..............',
        type: 'textarea',
        placeholder: 'Isi dengan pernyataan bertumbuh tentang hal yang sama...',
      },
      {
        id: 'growth_learning_way',
        label: 'Dan saya sedang belajar dengan cara : ..............',
        type: 'textarea',
        placeholder: 'Tuliskan caramu belajar menghadapi hal tersebut...',
      },
      {
        id: 'fear_motto',
        label: 'Kalimat untuk diri saya saat takut mencoba:',
        type: 'textarea',
        placeholder: 'Kalimat penyemangat pribadi saat rasa takut muncul...',
      },
    ],
  },
  {
    id: 3,
    title: 'Hambatan di jalan saya',
    subtitle: 'Obstacles',
    sectionTag: 'Obstacles',
    etapeNumber: 1,
    etapeTitle: 'Etape 1: Mengenali diri dan menghadapi tantangan',
    theme: 'Rawa-Rawa Keraguan',
    islandName: 'Goa Pembuka Rahasia',
    meetingPhase: 1,
    color: 'sky',
    badgeName: 'Mata Elang',
    badgeIcon: 'Eye',
    missionDescription:
      'Kenali hambatan dari dalam diri dan luar lingkungan, pahami alasannya, serta temukan cara melewatinya.',
    motivationalQuote: 'Menyadari hambatan adalah setengah jalan dari menemukan jalan keluar.',
    fields: [
      {
        id: 'internal_obstacles',
        sectionHeader: 'Hambatan dari dalam diri saya (pikiran, perasaan):',
        label: 'Tuliskan hambatan internal:',
        type: 'textarea',
        placeholder: 'Contoh: Takut salah, rasa cemas ditertawakan, suka menunda...',
      },
      {
        id: 'external_obstacles',
        sectionHeader: 'Hambatan dari luar (lingkungan, orang lain):',
        label: 'Tuliskan hambatan eksternal:',
        type: 'textarea',
        placeholder: 'Contoh: Godaan smartphone, suasana kelas berisik...',
      },
      {
        id: 'why_obstacle_arises',
        label: 'Mengapa hambatan itu muncul?',
        type: 'textarea',
        placeholder: 'Analisis penyebab di balik munculnya hambatan tersebut...',
      },
      {
        id: 'how_to_overcome',
        label: 'Cara saya melewatinya:',
        type: 'textarea',
        placeholder: 'Strategi konkret apa yang akan kamu lakukan...',
      },
      {
        id: 'giveup_motto',
        label: 'Kalimat untuk diri saya saat ingin menyerah:',
        type: 'textarea',
        placeholder: 'Pengingat untuk bangkit saat merasa ingin berhenti...',
      },
    ],
  },
  {
    id: 4,
    title: 'Langkah kecil saya',
    subtitle: 'Effort',
    sectionTag: 'Effort',
    etapeNumber: 1,
    etapeTitle: 'Etape 1: Mengenali diri dan menghadapi tantangan',
    theme: 'Jembatan Langkah Emas',
    islandName: 'Pondok Rencana Aksi',
    meetingPhase: 1,
    color: 'blue',
    badgeName: 'Arsitek Aksi',
    badgeIcon: 'Footprints',
    missionDescription:
      'Susun 3 langkah kecil menuju tantanganmu mulai dari yang paling mudah dan tentukan tanggal mulainya.',
    motivationalQuote: 'Kamu tidak perlu melihat seluruh anak tangga, cukup ambil langkah pertama.',
    fields: [
      {
        id: 'step_1',
        sectionHeader: 'Tiga langkah menuju tantangan saya, dari yang paling mudah:',
        label: '1. Langkah pertama (paling mudah):',
        type: 'text',
        placeholder: 'Langkah pertama yang paling ringan dan mudah dimulai...',
      },
      {
        id: 'step_2',
        label: '2. Langkah kedua:',
        type: 'text',
        placeholder: 'Langkah lanjutan...',
      },
      {
        id: 'step_3',
        label: '3. Langkah ketiga:',
        type: 'text',
        placeholder: 'Langkah ketiga...',
      },
      {
        id: 'start_date',
        sectionHeader: 'Rencana saya:',
        label: 'Mulai tanggal:',
        type: 'text',
        placeholder: 'Contoh: 20 September 2026 atau Mulai besok...',
      },
      {
        id: 'consistency_strategy',
        label: 'Agar konsisten:',
        type: 'text',
        placeholder: 'Contoh: Memasang alarm harian pukul 16.00...',
      },
      {
        id: 'helper_person',
        label: 'Yang membantu:',
        type: 'text',
        placeholder: 'Contoh: Teman sebangku, orang tua, guru BK...',
      },
      {
        id: 'step_done_motto',
        label: 'Kalimat untuk diri saya setiap selesai satu langkah:',
        type: 'textarea',
        placeholder: 'Apresiasi kepada diri sendiri setelah menyelesaikan satu langkah...',
      },
    ],
  },
  {
    id: 5,
    title: 'Saat saya dikritik',
    subtitle: 'Critiques',
    sectionTag: 'Critiques',
    etapeNumber: 2,
    etapeTitle: 'Etape 2: Belajar dari sekitar dan bertumbuh',
    theme: 'Air Terjun Kejernihan',
    islandName: 'Kuil Umpan Balik',
    meetingPhase: 2,
    color: 'indigo',
    badgeName: 'Hati Terbuka',
    badgeIcon: 'ShieldCheck',
    missionDescription:
      'Pilah masukan dari guru, teman, atau keluarga menjadi hal yang membangun dan menjatuhkan, lalu tentukan respons barumu.',
    motivationalQuote: 'Kritik bukan penilaian harga dirimu, melainkan petunjuk arah menuju karya yang lebih baik.',
    fields: [
      {
        id: 'received_criticism',
        label: 'Masukan yang pernah saya terima dari guru, teman, atau keluarga:',
        type: 'textarea',
        placeholder: 'Tuliskan masukan atau kritik yang pernah kamu terima...',
      },
      {
        id: 'constructive_aspect',
        sectionHeader: 'Evaluasi masukan tersebut:',
        label: 'Membangun:',
        type: 'textarea',
        placeholder: 'Bagian apa yang membangun atau memberi pelajaran berharga...',
      },
      {
        id: 'destructive_aspect',
        label: 'Menjatuhkan:',
        type: 'textarea',
        placeholder: 'Bagian apa yang terasa menjatuhkan atau kurang tepat...',
      },
      {
        id: 'what_i_improve',
        label: 'Yang saya ambil dan saya perbaiki:',
        type: 'textarea',
        placeholder: 'Poin perbaikan konkret yang kamu jalani...',
      },
      {
        id: 'response_strategy',
        label: 'Mulai sekarang, saya merespons kritik dengan cara:',
        type: 'textarea',
        placeholder: 'Sikap atau caramu merespons kritik di masa depan...',
      },
    ],
  },
  {
    id: 6,
    title: 'Belajar dari orang lain',
    subtitle: '(tokoh, guru, kakak kelas, teman, keluarga)',
    sectionTag: 'Success of others',
    etapeNumber: 2,
    etapeTitle: 'Etape 2: Belajar dari sekitar dan bertumbuh',
    theme: 'Desa Para Sahabat Bijak',
    islandName: 'Pustaka Inspirasi',
    meetingPhase: 2,
    color: 'violet',
    badgeName: 'Pembelajar Aktif',
    badgeIcon: 'Users',
    missionDescription:
      'Amati sosok yang kamu kagumi keberaniannya dan ambil satu kebiasaan yang bisa kamu tiru minggu ini.',
    motivationalQuote:
      'Keberhasilan orang lain bukan ukuran kegagalan saya. Itu bukti bahwa hal itu bisa dicapai.',
    reminderText:
      'Keberhasilan orang lain bukan ukuran kegagalan saya. Itu bukti bahwa hal itu bisa dicapai.',
    fields: [
      {
        id: 'admired_figure',
        label: 'Siapa yang saya kagumi keberaniannya, dan siapa dia bagi saya?',
        type: 'textarea',
        placeholder: 'Sebutkan nama dan hubungannya (tokoh, guru, kakak kelas, teman, atau keluarga)...',
      },
      {
        id: 'confidence_actions',
        label: 'Apa yang ia lakukan sehingga terlihat percaya diri?',
        type: 'textarea',
        placeholder: 'Tuliskan hal konkret yang ia lakukan...',
      },
      {
        id: 'imitation_action',
        label: 'Satu hal darinya yang bisa saya tiru minggu ini:',
        type: 'textarea',
        placeholder: 'Tindakan nyata yang akan kamu coba tiru...',
      },
    ],
  },
  {
    id: 7,
    title: 'Melihat kembali usaha saya',
    subtitle: 'Refleksi',
    sectionTag: 'Refleksi',
    etapeNumber: 2,
    etapeTitle: 'Etape 2: Belajar dari sekitar dan bertumbuh',
    theme: 'Cermin Keheningan Bintang',
    islandName: 'Menara Refleksi',
    meetingPhase: 2,
    color: 'purple',
    badgeName: 'Penghargai Proses',
    badgeIcon: 'Sparkles',
    missionDescription:
      'Setelah mencoba langkahmu selama satu minggu, refleksikan apa yang sudah berhasil dan bagian yang perlu diperbaiki.',
    motivationalQuote: PEGANGAN_DI_SEPANJANG_JALAN,
    fields: [
      {
        id: 'what_succeeded',
        label: 'Setelah mencoba langkah saya, apa yang sudah berhasil?',
        type: 'textarea',
        placeholder: 'Tuliskan pencapaian yang berhasil kamu lakukan...',
      },
      {
        id: 'what_failed_and_why',
        label: 'Bagian mana yang masih kurang berhasil, dan mengapa?',
        type: 'textarea',
        placeholder: 'Evaluasi bagian yang belum berjalan sesuai rencana...',
      },
      {
        id: 'new_self_knowledge',
        label: 'Hal baru yang saya ketahui tentang diri saya:',
        type: 'textarea',
        placeholder: 'Wawasan atau fakta baru mengenai dirimu...',
      },
      {
        id: 'felt_changes',
        label: 'Perubahan kecil yang sudah saya rasakan:',
        type: 'textarea',
        placeholder: 'Perubahan positif pada cara berpikir atau perasaanmu...',
      },
    ],
  },
  {
    id: 8,
    title: 'Komitmen dan target saya',
    subtitle: 'Garis akhir',
    sectionTag: 'Garis akhir',
    etapeNumber: 2,
    etapeTitle: 'Etape 2: Belajar dari sekitar dan bertumbuh',
    theme: 'Kuil Penobatan Juara',
    islandName: 'Puncak Growth Mindset',
    meetingPhase: 2,
    color: 'amber',
    badgeName: 'Growth Master',
    badgeIcon: 'Award',
    missionDescription:
      'Tetapkan target satu minggu ke depan, ukur keyakinanmu, dan nyatakan komitmen perubahan diri.',
    motivationalQuote: PESAN_UNTUK_DIRI_SAYA,
    fields: [
      {
        id: 'target_week_1',
        sectionHeader: 'Target satu minggu ke depan:',
        label: 'Target 1:',
        type: 'text',
        placeholder: 'Target konkret 1...',
      },
      {
        id: 'target_week_2',
        label: 'Target 2:',
        type: 'text',
        placeholder: 'Target konkret 2...',
      },
      {
        id: 'target_week_3',
        label: 'Target 3:',
        type: 'text',
        placeholder: 'Target konkret 3...',
      },
      {
        id: 'future_confidence_scale',
        label: 'Keyakinan saya terhadap perubahan diri saya berada pada angka:',
        type: 'slider',
        min: 1,
        max: 5,
        step: 1,
        minLabel: 'Belum yakin',
        maxLabel: 'Sangat yakin',
        helperText: 'Skala 1 (Belum yakin) sampai 5 (Sangat yakin)',
      },
      {
        id: 'final_commitment',
        label: 'Saya berkomitmen untuk:',
        type: 'textarea',
        placeholder: 'Tuliskan ikrar komitmen kesungguhanmu...',
      },
    ],
  },
];

// ⚠️ SECURITY FIX: Password harus diubah segera setelah deploy pertama kali
// Jangan gunakan password default ini di production!
export const DEFAULT_ADMIN: AdminCredentials = {
  username: 'admin_bk_growth2026',
  password: 'SecureBK$GrowthMindset2026!', // ← GANTI INI SETELAH DEPLOY PERTAMA!
  name: 'Guru Pembimbing BK',
};

// Hash placeholder untuk future bcrypt implementation
export const ADMIN_PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjAG.iHvQiM5ZlWCzVXm'; 

export const INITIAL_STUDENTS: ActiveStudent[] = [];

export const INITIAL_JOURNEYS: Record<string, StudentJourney> = {};
