import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole, DifficultyLevel, TryoutStatus, DiscussionVisibility } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be defined to run seed");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Clean existing data in reverse relation order
  console.log("🧹 Cleaning old records...");
  await prisma.examTopicScore.deleteMany();
  await prisma.examAnswer.deleteMany();
  await prisma.examSession.deleteMany();
  await prisma.tryoutQuestion.deleteMany();
  await prisma.tryout.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  // 2. Schools
  console.log("🏫 Creating schools...");
  const school1 = await prisma.school.create({
    data: {
      name: "SMA Negeri 1 Jakarta",
      npsn: "20101588",
      address: "Jl. Budi Utomo No. 7, Pasar Baru",
      city: "Jakarta Pusat",
      province: "DKI Jakarta",
    },
  });

  const school2 = await prisma.school.create({
    data: {
      name: "MAN 3 Ngawi",
      npsn: "20580012",
      address: "Jl. Raya Ngawi - Solo Km. 5",
      city: "Ngawi",
      province: "Jawa Timur",
    },
  });

  // 3. Users (Admin, Teacher, Students)
  console.log("👥 Creating users...");
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Administrator",
      email: "admin@tryoutku.com",
      emailVerified: new Date(),
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
      phone: "081234567890",
    },
  });

  const teacher = await prisma.user.create({
    data: {
      name: "Budi Hartanto, S.Pd",
      email: "guru@tryoutku.com",
      emailVerified: new Date(),
      passwordHash: defaultPasswordHash,
      role: UserRole.TEACHER,
      phone: "081234567891",
      schoolId: school1.id,
    },
  });

  const student1 = await prisma.user.create({
    data: {
      name: "Ahmad Fauzi",
      email: "ahmad@tryoutku.com",
      emailVerified: new Date(),
      passwordHash: defaultPasswordHash,
      role: UserRole.STUDENT,
      schoolClass: "XII IPS 1",
      schoolId: school1.id,
      phone: "081234567892",
    },
  });

  const student2 = await prisma.user.create({
    data: {
      name: "Citra Lestari",
      email: "citra@tryoutku.com",
      emailVerified: new Date(),
      passwordHash: defaultPasswordHash,
      role: UserRole.STUDENT,
      schoolClass: "XII IPS 2",
      schoolId: school2.id,
      phone: "081234567893",
    },
  });

  // 4. Subject & Topics
  console.log("📚 Creating subject and topics...");
  const sosiologi = await prisma.subject.create({
    data: {
      name: "Sosiologi",
      code: "SOS",
      description: "Mata pelajaran Sosiologi untuk jenjang SMA/MA.",
    },
  });

  const topicIdentitas = await prisma.topic.create({
    data: {
      name: "Identitas Sosial",
      subjectId: sosiologi.id,
      description: "Konsep diri, pembentukan identitas, dan peranan sosial dalam masyarakat.",
    },
  });

  const topicKelompok = await prisma.topic.create({
    data: {
      name: "Kelompok Sosial",
      subjectId: sosiologi.id,
      description: "Struktur kelompok sosial, gemeinschaft & gesellschaft, in-group & out-group.",
    },
  });

  const topicKonflik = await prisma.topic.create({
    data: {
      name: "Konflik Sosial",
      subjectId: sosiologi.id,
      description: "Penyebab konflik, bentuk kekerasan, resolusi, dan akomodasi konflik.",
    },
  });

  const topicPerubahan = await prisma.topic.create({
    data: {
      name: "Perubahan Sosial",
      subjectId: sosiologi.id,
      description: "Modernisasi, globalisasi, faktor pendorong & penghambat perubahan sosial.",
    },
  });

  // 5. 20 Questions (5 per Topic) with Options A-E and Explanations
  console.log("❓ Creating 20 questions...");
  const questionsData = [
    // --- Topik 1: Identitas Sosial (5 soal) ---
    {
      topicId: topicIdentitas.id,
      difficulty: DifficultyLevel.EASY,
      content: "Identitas sosial seseorang yang diperoleh sejak lahir tanpa melalui usaha atau perjuangan disebut dengan...",
      explanation: "Ascribed status adalah status atau kedudukan sosial yang diperoleh seseorang secara otomatis sejak lahir (kelahiran), seperti gelar kebangsawanan atau jenis kelamin.",
      options: [
        { label: "A", content: "Achieved status", isCorrect: false },
        { label: "B", content: "Ascribed status", isCorrect: true },
        { label: "C", content: "Assigned status", isCorrect: false },
        { label: "D", content: "Symbolic status", isCorrect: false },
        { label: "E", content: "Perceived status", isCorrect: false },
      ],
    },
    {
      topicId: topicIdentitas.id,
      difficulty: DifficultyLevel.MEDIUM,
      content: "Proses pembentukan identitas individu melalui peniruan peran orang-orang di sekitarnya menurut George Herbert Mead berada pada tahap...",
      explanation: "Menurut Mead, Play Stage adalah tahap di mana anak mulai meniru peran orang dewasa di sekitarnya secara sadar, meskipun belum memahami sistem aturan yang kompleks.",
      options: [
        { label: "A", content: "Preparatory stage", isCorrect: false },
        { label: "B", content: "Play stage", isCorrect: true },
        { label: "C", content: "Game stage", isCorrect: false },
        { label: "D", content: "Generalized other", isCorrect: false },
        { label: "E", content: "Looking-glass self", isCorrect: false },
      ],
    },
    {
      topicId: topicIdentitas.id,
      difficulty: DifficultyLevel.MEDIUM,
      content: "Seorang anak petani berhasil menyelesaikan pendidikan kedokteran dan kini bekerja sebagai dokter spesialis. Status sosial dokter tersebut merupakan contoh dari...",
      explanation: "Achieved status adalah status yang diraih berkat usaha, kerja keras, dan prestasi individu secara sengaja.",
      options: [
        { label: "A", content: "Ascribed status", isCorrect: false },
        { label: "B", content: "Assigned status", isCorrect: false },
        { label: "C", content: "Achieved status", isCorrect: true },
        { label: "D", content: "Inherent status", isCorrect: false },
        { label: "E", content: "Traditional status", isCorrect: false },
      ],
    },
    {
      topicId: topicIdentitas.id,
      difficulty: DifficultyLevel.HARD,
      content: "Konsep diri seseorang terbentuk dari bagaimana ia membayangkan pandangan orang lain terhadap dirinya. Teori pembentukan identitas ini dikemukakan oleh Charles Horton Cooley yang dikenal dengan istilah...",
      explanation: "Charles Horton Cooley mengemukakan teori Looking-Glass Self, yaitu konsep bahwa cerminan diri seseorang terbentuk melalui persepsi atas penilaian orang lain terhadap dirinya.",
      options: [
        { label: "A", content: "Collective Consciousness", isCorrect: false },
        { label: "B", content: "Looking-Glass Self", isCorrect: true },
        { label: "C", content: "Role Distance", isCorrect: false },
        { label: "D", content: "Impression Management", isCorrect: false },
        { label: "E", content: "Habitus", isCorrect: false },
      ],
    },
    {
      topicId: topicIdentitas.id,
      difficulty: DifficultyLevel.EASY,
      content: "Status sosial yang diberikan oleh masyarakat atau kelompok kepada seseorang karena jasa-jasanya yang luar biasa disebut...",
      explanation: "Assigned status adalah status yang diberikan kepada seseorang sebagai bentuk penghargaan atau pengakuan atas jasa-jasanya, seperti gelar pahlawan nasional.",
      options: [
        { label: "A", content: "Ascribed status", isCorrect: false },
        { label: "B", content: "Achieved status", isCorrect: false },
        { label: "C", content: "Assigned status", isCorrect: true },
        { label: "D", content: "Acquired status", isCorrect: false },
        { label: "E", content: "Inherited status", isCorrect: false },
      ],
    },

    // --- Topik 2: Kelompok Sosial (5 soal) ---
    {
      topicId: topicKelompok.id,
      difficulty: DifficultyLevel.EASY,
      content: "Kelompok sosial yang didasarkan pada ikatan batin yang murni, alamiah, dan kekal seperti ikatan keluarga disebut oleh Ferdinand Tonnies sebagai...",
      explanation: "Gemeinschaft (paguyuban) adalah bentuk kehidupan bersama di mana anggota-anggotanya diikat oleh hubungan batin yang murni, mendalam, dan bersifat kekal.",
      options: [
        { label: "A", content: "Gesellschaft", isCorrect: false },
        { label: "B", content: "Gemeinschaft", isCorrect: true },
        { label: "C", content: "Out-group", isCorrect: false },
        { label: "D", content: "Secondary group", isCorrect: false },
        { label: "E", content: "Membership group", isCorrect: false },
      ],
    },
    {
      topicId: topicKelompok.id,
      difficulty: DifficultyLevel.MEDIUM,
      content: "Hubungan antaranggota dalam suatu perusahaan atau serikat buruh bersifat kontraktual, formal, dan berdasarkan kepentingan rasional. Kelompok ini termasuk dalam kategori...",
      explanation: "Gesellschaft (patembayan) adalah bentuk ikatan kelompok sosial yang bersifat pamrih, formal, kontraktual, dan berlangsung untuk jangka waktu tertentu.",
      options: [
        { label: "A", content: "Gemeinschaft by blood", isCorrect: false },
        { label: "B", content: "Gemeinschaft of place", isCorrect: false },
        { label: "C", content: "Gesellschaft", isCorrect: true },
        { label: "D", content: "Primary group", isCorrect: false },
        { label: "E", content: "Gemeinschaft of mind", isCorrect: false },
      ],
    },
    {
      topicId: topicKelompok.id,
      difficulty: DifficultyLevel.MEDIUM,
      content: "Seseorang yang secara fisik belum terdaftar sebagai anggota suatu kelompok, tetapi perilakunya selalu meniru norma dan gaya hidup kelompok tersebut menjadikan kelompok itu sebagai...",
      explanation: "Reference group adalah kelompok sosial yang menjadi acuan atau pedoman bagi seseorang (bukan anggota resmi) dalam membentuk kepribadian dan perilakunya.",
      options: [
        { label: "A", content: "Membership group", isCorrect: false },
        { label: "B", content: "Reference group", isCorrect: true },
        { label: "C", content: "Primary group", isCorrect: false },
        { label: "D", content: "Informal group", isCorrect: false },
        { label: "E", content: "In-group", isCorrect: false },
      ],
    },
    {
      topicId: topicKelompok.id,
      difficulty: DifficultyLevel.HARD,
      content: "Kelompok sosial yang terbentuk karena adanya pertemuan berulang secara spontan dan memiliki kepentingan bersama yang sementara, seperti kerumunan orang yang melihat demonstrasi seni, disebut...",
      explanation: "Spectator crowds (kerumunan penonton) adalah kerumunan yang terjadi karena orang-orang ingin melihat suatu kejadian atau peristiwa tertentu tanpa direncanakan sebelumnya.",
      options: [
        { label: "A", content: "Panic crowds", isCorrect: false },
        { label: "B", content: "Spectator crowds", isCorrect: true },
        { label: "C", content: "Acting mobs", isCorrect: false },
        { label: "D", content: "Formal audience", isCorrect: false },
        { label: "E", content: "Immoral crowds", isCorrect: false },
      ],
    },
    {
      topicId: topicKelompok.id,
      difficulty: DifficultyLevel.EASY,
      content: "Sikap kecenderungan seseorang yang menganggap kelompoknya sendiri (in-group) adalah yang paling baik dan menilai kelompok luar (out-group) dengan standar nilai kelompoknya disebut...",
      explanation: "Etnosentrisme adalah kecenderungan memandang kelompok sendiri sebagai pusat segala sesuatu dan menggunakan standarnya untuk menilai kelompok lain.",
      options: [
        { label: "A", content: "Relativisme budaya", isCorrect: false },
        { label: "B", content: "Etnosentrisme", isCorrect: true },
        { label: "C", content: "Primordialisme", isCorrect: false },
        { label: "D", content: "Pluralisme", isCorrect: false },
        { label: "E", content: "Chauvinisme", isCorrect: false },
      ],
    },

    // --- Topik 3: Konflik Sosial (5 soal) ---
    {
      topicId: topicKonflik.id,
      difficulty: DifficultyLevel.EASY,
      content: "Bentuk akomodasi konflik di mana pihak-pihak yang bertikai sepakat menunjuk pihak ketiga yang netral dan keputusannya bersifat mengikat disebut...",
      explanation: "Arbitrasi adalah penyelesaian perselisihan oleh pihak ketiga yang disepakati oleh pihak-pihak yang bersengketa dan keputusannya wajib ditaati (mengikat).",
      options: [
        { label: "A", content: "Mediasi", isCorrect: false },
        { label: "B", content: "Arbitrasi", isCorrect: true },
        { label: "C", content: "Konsiliasi", isCorrect: false },
        { label: "D", content: "Kompromi", isCorrect: false },
        { label: "E", content: "Ajudikasi", isCorrect: false },
      ],
    },
    {
      topicId: topicKonflik.id,
      difficulty: DifficultyLevel.MEDIUM,
      content: "Penyelesaian perselisihan antara serikat pekerja dan pengusaha dilakukan melalui pengadilan hubungan industrial. Bentuk akomodasi ini disebut...",
      explanation: "Ajudikasi adalah penyelesaian sengketa atau perselisihan melalui jalur hukum di pengadilan.",
      options: [
        { label: "A", content: "Mediasi", isCorrect: false },
        { label: "B", content: "Arbitrasi", isCorrect: false },
        { label: "C", content: "Ajudikasi", isCorrect: true },
        { label: "D", content: "Stalemate", isCorrect: false },
        { label: "E", content: "Koersi", isCorrect: false },
      ],
    },
    {
      topicId: topicKonflik.id,
      difficulty: DifficultyLevel.MEDIUM,
      content: "Dua negara yang terlibat konflik bersenjata berhenti berperang karena memiliki kekuatan seimbang sehingga konflik tidak dapat berlanjut. Kondisi ini disebut...",
      explanation: "Stalemate adalah keadaan ketika pihak-pihak yang bertikai memiliki kekuatan seimbang sehingga pertikaian berhenti dengan sendirinya pada titik tertentu.",
      options: [
        { label: "A", content: "Gencatan senjata", isCorrect: false },
        { label: "B", content: "Stalemate", isCorrect: true },
        { label: "C", content: "Kompromi", isCorrect: false },
        { label: "D", content: "Toleransi", isCorrect: false },
        { label: "E", content: "Segregasi", isCorrect: false },
      ],
    },
    {
      topicId: topicKonflik.id,
      difficulty: DifficultyLevel.HARD,
      content: "Menurut Lewis A. Coser, konflik sosial tidak selalu bersifat merusak melainkan dapat memiliki fungsi positif bagi masyarakat, salah satunya adalah...",
      explanation: "Lewis A. Coser menyatakan bahwa konflik dengan kelompok luar (out-group) dapat memperkuat solidaritas, integrasi, dan persatuan di antara anggota in-group.",
      options: [
        { label: "A", content: "Menghapuskan seluruh strata sosial", isCorrect: false },
        { label: "B", content: "Memperkuat integrasi dan solidaritas in-group", isCorrect: true },
        { label: "C", content: "Menghilangkan perbedaan pandangan individu", isCorrect: false },
        { label: "D", content: "Mempercepat proses asimilasi total", isCorrect: false },
        { label: "E", content: "Menciptakan keseragaman budaya", isCorrect: false },
      ],
    },
    {
      topicId: topicKonflik.id,
      difficulty: DifficultyLevel.EASY,
      content: "Penyelesaian konflik dengan menghadirkan pihak ketiga sebagai penasihat tanpa hak untuk mengambil keputusan yang mengikat disebut...",
      explanation: "Mediasi adalah upaya penyelesaian konflik dengan melibatkan pihak ketiga yang netral sebagai penengah/fasilitator, namun keputusannya tidak mengikat.",
      options: [
        { label: "A", content: "Arbitrasi", isCorrect: false },
        { label: "B", content: "Mediasi", isCorrect: true },
        { label: "C", content: "Koersi", isCorrect: false },
        { label: "D", content: "Konsiliasi", isCorrect: false },
        { label: "E", content: "Ajudikasi", isCorrect: false },
      ],
    },

    // --- Topik 4: Perubahan Sosial (5 soal) ---
    {
      topicId: topicPerubahan.id,
      difficulty: DifficultyLevel.EASY,
      content: "Perubahan sosial yang berlangsung secara bertahap dan membutuhkan waktu yang relatif lama tanpa perencanaan matang disebut...",
      explanation: "Evolusi sosial adalah bentuk perubahan sosial yang berlangsung lambat, bertahap, dan dalam jangka waktu yang panjang.",
      options: [
        { label: "A", content: "Revolusi", isCorrect: false },
        { label: "B", content: "Evolusi", isCorrect: true },
        { label: "C", content: "Inovasi", isCorrect: false },
        { label: "D", content: "Modernisasi", isCorrect: false },
        { label: "E", content: "Transformasi", isCorrect: false },
      ],
    },
    {
      topicId: topicPerubahan.id,
      difficulty: DifficultyLevel.MEDIUM,
      content: "Ketertinggalan unsur kebudayaan rohani/non-material terhadap perkembangan kebudayaan material (teknologi) menurut William F. Ogburn dinamakan...",
      explanation: "Cultural lag (ketertinggalan budaya) adalah kondisi di mana laju perkembangan kebudayaan material (seperti gadget) lebih cepat daripada norma, moral, atau hukum non-material masyarakat.",
      options: [
        { label: "A", content: "Cultural shock", isCorrect: false },
        { label: "B", content: "Cultural lag", isCorrect: true },
        { label: "C", content: "Cultural animosity", isCorrect: false },
        { label: "D", content: "Cultural diffusion", isCorrect: false },
        { label: "E", content: "Cultural survival", isCorrect: false },
      ],
    },
    {
      topicId: topicPerubahan.id,
      difficulty: DifficultyLevel.MEDIUM,
      content: "Salah satu faktor pendorong terjadinya perubahan sosial yang bersumber dari dalam masyarakat (faktor internal) adalah...",
      explanation: "Faktor internal perubahan sosial berasal dari dalam masyarakat itu sendiri, antara lain pertambahan/pengurangan penduduk, penemuan baru (discovery/invention), dan pertentangan dalam masyarakat.",
      options: [
        { label: "A", content: "Terjadinya bencana alam", isCorrect: false },
        { label: "B", content: "Penemuan baru dalam masyarakat (inovasi)", isCorrect: true },
        { label: "C", content: "Pengaruh kebudayaan masyarakat luar", isCorrect: false },
        { label: "D", content: "Invasi militer negara lain", isCorrect: false },
        { label: "E", content: "Perubahan iklim global", isCorrect: false },
      ],
    },
    {
      topicId: topicPerubahan.id,
      difficulty: DifficultyLevel.HARD,
      content: "Teori yang menyatakan bahwa sejarah masyarakat berkembang melalui pola siklus seperti kelahiran, pertumbuhan, kejayaan, keruntuhan, dan kembali ke pola awal dikemukakan oleh...",
      explanation: "Oswald Spengler dan Arnold Toynbee mengemukakan teori siklus, di mana peradaban manusia tumbuh, mekar, runtuh, dan berulang seperti siklus kehidupan.",
      options: [
        { label: "A", content: "Auguste Comte", isCorrect: false },
        { label: "B", content: "Oswald Spengler", isCorrect: true },
        { label: "C", content: "Karl Marx", isCorrect: false },
        { label: "D", content: "Max Weber", isCorrect: false },
        { label: "E", content: "Emile Durkheim", isCorrect: false },
      ],
    },
    {
      topicId: topicPerubahan.id,
      difficulty: DifficultyLevel.EASY,
      content: "Sikap masyarakat yang enggan menerima hal-hal baru karena menganggap adat istiadat leluhur adalah yang paling sempurna merupakan faktor...",
      explanation: "Sikap tradisionalistis dan vested interest (kepentingan yang tertanam kuat) merupakan salah satu faktor utama yang menghambat terjadinya perubahan sosial.",
      options: [
        { label: "A", content: "Pendorong perubahan sosial", isCorrect: false },
        { label: "B", content: "Penghambat perubahan sosial", isCorrect: true },
        { label: "C", content: "Pemicu modernisasi", isCorrect: false },
        { label: "D", content: "Pemicu globalisasi", isCorrect: false },
        { label: "E", content: "Pembentuk difusi budaya", isCorrect: false },
      ],
    },
  ];

  const createdQuestions = [];
  for (const q of questionsData) {
    const question = await prisma.question.create({
      data: {
        topicId: q.topicId,
        createdById: teacher.id,
        content: q.content,
        difficulty: q.difficulty,
        explanation: q.explanation,
        options: {
          create: q.options.map((opt) => ({
            label: opt.label,
            content: opt.content,
            isCorrect: opt.isCorrect,
          })),
        },
      },
    });
    createdQuestions.push(question);
  }

  // 6. Tryout Package (PUBLISHED)
  console.log("📝 Creating Published Tryout Package...");
  const tryout = await prisma.tryout.create({
    data: {
      title: "Tryout Sosiologi Paket 01",
      description: "Tryout komprehensif mencakup 4 materi inti: Identitas Sosial, Kelompok Sosial, Konflik Sosial, dan Perubahan Sosial. Waktu pengerjaan 60 menit.",
      subjectId: sosiologi.id,
      createdById: teacher.id,
      durationMinutes: 60,
      passingScore: 75.0,
      status: TryoutStatus.PUBLISHED,
      discussionVisibility: DiscussionVisibility.AFTER_SUBMIT,
      tryoutQuestions: {
        create: createdQuestions.map((q, idx) => ({
          questionId: q.id,
          orderNumber: idx + 1,
          weight: 1.0,
        })),
      },
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log({
    users: {
      admin: admin.email,
      teacher: teacher.email,
      student1: student1.email,
      student2: student2.email,
      defaultPassword: "Password123!",
    },
    subject: sosiologi.name,
    topicsCount: 4,
    questionsCount: createdQuestions.length,
    tryout: {
      id: tryout.id,
      title: tryout.title,
      questionsAttached: createdQuestions.length,
    },
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
