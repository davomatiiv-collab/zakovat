import { BankQuestion } from '../types/index.ts';

export const SEED_BANK_QUESTIONS: BankQuestion[] = [
  {
    id: 'bq-1',
    text: "Ushbu buyum qadimda Xitoyda kashf etilgan bo'lib, dastlab 'janubni ko'rsatuvchi qoshiq' deb atalgan. Keyinchalik u dengizchilik va geografik kashfiyotlar davrida butun dunyo bo'ylab keng tarqaldi. Bu qaysi asbob?",
    correctAnswer: "Kompas",
    explanation: "Kompas qadimgi Xitoyda magnitlangan temir qoshiq shaklida ixtiro qilingan bo'lib, keyinchalik Yevropaga yetib kelgan.",
    category: "Fan va texnika",
    difficulty: "oson",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-2',
    text: "Alisher Navoiy o'zining mashhur 'Xamsa' dostonlar majmuasining ikkinchi dostonini qaysi afsonaviy oshiq-ma'shuqlarga bag'ishlagan?",
    correctAnswer: "Farhod va Shirin",
    explanation: "Navoiy 'Xamsa'sidagi dostonlar tartibi: Hayrat ul-abror, Farhod va Shirin, Layli va Majnun, Sab'ai sayyor, Saddi Iskandariy.",
    category: "Adabiyot",
    difficulty: "oson",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-3',
    text: "Rim imperatori Yuliy Sezar miloddan avvalgi 47-yilda Pont podshosi Farnak ustidan qozongan tezkor g'alabasini Senatga yuborgan xatida uchta so'z bilan ifodalagan. Bu mashhur uchta so'zni ayting.",
    correctAnswer: "Keldim, ko'rdim, yengdim",
    explanation: "Lotincha 'Veni, vidi, vici' (Keldim, ko'rdim, g'alaba qozondim / yengdim).",
    category: "Tarix",
    difficulty: "orta",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-4',
    text: "U qanchalik ko'p bo'lsa, siz shunchalik kam ko'rasiz. Diqqat, savol: gap nima haqida ketmoqda?",
    correctAnswer: "Qorong'ulik",
    explanation: "Qorong'ulik yoki zulmat qancha ko'payib borsa, inson ko'rish qobiliyati shuncha pasayadi.",
    category: "Mantiq",
    difficulty: "oson",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-5',
    text: "Amir Temur saltanatining davlat ramzi va muhri bo'lgan uchta halqa (doira) nimani anglatadi?",
    correctAnswer: "Uch iqlim (yer yuzining uch qit'asi)",
    explanation: "Uchta tutash halqa yer yuzining o'sha paytda ma'lum bo'lgan uch qit'asi — Osiyo, Yevropa va Afrikaga hukmronlikni ifodalagan.",
    category: "Tarix",
    difficulty: "orta",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-6',
    text: "Dunyodagi eng katta ko'l hisoblangan, biroq ulkan maydoni va suvining sho'rligi sababli 'dengiz' deb ataluvchi havzani toping.",
    correctAnswer: "Kaspiy dengizi",
    explanation: "Kaspiy — dunyodagi eng katta berk ko'l bo'lib, o'lchami va gidrologik xususiyatlari tufayli dengiz deb nomlanadi.",
    category: "Geografiya",
    difficulty: "oson",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-7',
    text: "O'zbek xalqining buyuk qomusi hisoblangan 'Alpomish' dostonida qahramonning sadoqatli oti nima deb ataladi?",
    correctAnswer: "Boychibor",
    explanation: "Alpomish dostonida Alpomishning sevimli tulpori Boychibor deb ataladi.",
    category: "Adabiyot",
    difficulty: "oson",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-8',
    text: "Inson tanasidagi eng katta ichki a'zo bo'lib, u 500 dan ortiq hayotiy muhim funksiyalarni bajaradi, jumladan qonni toksinlardan tozalaydi. Bu qaysi a'zo?",
    correctAnswer: "Jigar",
    explanation: "Jigar (liver) inson organizmidagi eng yirik ichki a'zo va asosiy biologik laboratoriya hisoblanadi.",
    category: "Biologiya",
    difficulty: "orta",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-9',
    text: "Sharq Uyg'onish davrining buyuk allomasi Abu Rayhon Beruniy o'z davrida Yer radiusini qaysi hududda o'tkazgan geodezik o'lchovlar orqali aniq hisoblab chiqqan?",
    correctAnswer: "Nandna qal'asi",
    explanation: "Beruniy hozirgi Pokiston hududidagi Nandna qal'asi tepaligidan turib Yer shari radiusini juda yuqori aniqlikda (xatolik 1% dan kam) o'lchagan.",
    category: "Tarix",
    difficulty: "qiyin",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-10',
    text: "Leonardo da Vinchi tomonidan chizilgan, hozirda Parijdagi Luvr muzeyida saqlanuvchi, sirliligi bilan butun dunyoni hayratga solgan mashhur portret asarini ayting.",
    correctAnswer: "Mona Liza",
    explanation: "Mona Liza (yoki Jokonda) — Leonardo da Vinchining eng taniqli durdonasi.",
    category: "San'at",
    difficulty: "oson",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-11',
    text: "U har kuni ertalab boshini yo'qotadi, kechasi esa uni yana topadi. Diqqat, savol: bu qanday buyum?",
    correctAnswer: "Yostiq",
    explanation: "Yostiq ustiga kechasi inson boshi qo'yiladi, ertalab bosh undan olinadi.",
    category: "Mantiq",
    difficulty: "orta",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-12',
    text: "1969-yil 20-iyulda 'Bu inson uchun kichik bir qadam, biroq butun insoniyat uchun ulkan sakrashdir' degan tarixiy so'zlarni aytgan birinchi fazogir kim edi?",
    correctAnswer: "Nil Armstrong",
    explanation: "Nil Armstrong Opolon-11 missiyasida Oy yuzasiga qadam qo'ygan birinchi inson bo'ldi.",
    category: "Fan va texnika",
    difficulty: "oson",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-13',
    text: "Ibn Sino o'zining mashhur 'Tib qonunlari' asarida shunday yozadi: 'Agar barcha kasalliklar sababini bitta narsaga bog'lash kerak bo'lsa, bu...'. Ibn Sino nimani ko'rsatgan?",
    correctAnswer: "Harakatsizlik (kamharakatlik)",
    explanation: "Ibn Sino jismoniy harakatning inson salomatligi uchun bosh omil ekanini ta'kidlagan: 'Harakat har qanday dori o'rnini bosa oladi, ammo hech qanday dori harakat o'rnini bosolmaydi'.",
    category: "Tibbiyot",
    difficulty: "qiyin",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-14',
    text: "Dunyodagi eng qadimgi va eng chuqur chuchuk suvli ko'l qaysi?",
    correctAnswer: "Baykal",
    explanation: "Baykal ko'lining chuqurligi 1642 metr bo'lib, sayyoramizdagi barcha chuchuk suv zaxirasining 20 foizini o'zida jamlagan.",
    category: "Geografiya",
    difficulty: "oson",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bq-15',
    text: "Shaxmat taxtasida ikkita shoh orasidagi eng kichik masofa necha katakdan kam bo'lishi mumkin emas?",
    correctAnswer: "1 katak",
    explanation: "Shaxmat qoidasiga ko'ra, ikkita shoh hech qachon yonma-yon kataklarda tura olmaydi, ular orasida kamida bir katak bo'sh joy bo'lishi shart.",
    category: "Mantiq",
    difficulty: "orta",
    suggestedTimeSec: 60,
    points: 1,
    createdAt: new Date().toISOString()
  }
];
