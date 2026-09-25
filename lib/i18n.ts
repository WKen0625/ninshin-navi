// 言語（トップページとコラムだけ。Navi本体は日本語）。画面の文言はここにまとめる。
// 2026-09-23: 英語に加えて 中国語（簡体字）・韓国語・ロシア語。

export const LANGS = ["ja", "en", "zh", "ko", "ru"] as const;
export type Lang = (typeof LANGS)[number];
export const isLang = (v: string | null | undefined): v is Lang => LANGS.includes(v as Lang);
/** 日本語以外（/<lang> のトップページがある言語） */
export const FOREIGN_LANGS = LANGS.filter((l) => l !== "ja") as Exclude<Lang, "ja">[];

export const LANG_NAME: Record<Lang, string> = { ja: "日本語", en: "English", zh: "中文", ko: "한국어", ru: "Русский" };

/** いまの言語: /<lang> のトップページならその言語。コラム（/articles?lang=）は ?lang=。それ以外は日本語 */
export function langOf(path: string, query: string | null): Lang {
  const first = path.split("/")[1];
  if (isLang(first)) return first;
  return path.startsWith("/articles") && isLang(query) ? query : "ja";
}

/** 画面下の共通の文言（設計原則10「最終確認は窓口・医療機関へ」は全画面） */
export const FOOTER: Record<Lang, { disclaimer: string; about: string; contact: string; privacy: string; terms: string; policy: string; draft: string }> = {
  ja: { disclaimer: "最終確認は窓口・医療機関へ。", about: "このサイトについて", contact: "コンタクト", privacy: "記録と同意（保存するもの・取り消し）", terms: "利用規約", policy: "プライバシーポリシー", draft: "（下書き）" },
  en: { disclaimer: "Always confirm with your ward office or your clinic.", about: "About this site", contact: "Contact", privacy: "Records & consent (what is stored, how to withdraw)", terms: "Terms of use", policy: "Privacy policy", draft: " (draft, Japanese)" },
  zh: { disclaimer: "最终请向区役所窗口或医疗机构确认。", about: "关于本站", contact: "联系", privacy: "记录与同意（保存内容・撤回）", terms: "使用条款", policy: "隐私政策", draft: "（草案・日语）" },
  ko: { disclaimer: "최종 확인은 구청 창구·의료기관에서 하세요.", about: "이 사이트에 대해", contact: "문의", privacy: "기록과 동의（저장 항목·철회）", terms: "이용약관", policy: "개인정보 처리방침", draft: "（초안·일본어）" },
  ru: { disclaimer: "Окончательно уточняйте в администрации района и в клинике.", about: "О сайте", contact: "Контакт", privacy: "Записи и согласие (что хранится, как отозвать)", terms: "Условия использования", policy: "Политика конфиденциальности", draft: " (черновик, на японском)" },
};

/** トップページの場所。日本語は /、ほかは /<lang> */
export const homeOf = (lang: Lang) => (lang === "ja" ? "/" : `/${lang}`);
/** コラム一覧の場所 */
export const columnsOf = (lang: Lang, stage?: string) => {
  const q = new URLSearchParams({ ...(lang === "ja" ? {} : { lang }), ...(stage && stage !== "all" ? { stage } : {}) }).toString();
  return `/articles${q ? `?${q}` : ""}`;
};
export const articleOf = (slug: string, lang: Lang) => `/articles/${slug}${lang === "ja" ? "" : `?lang=${lang}`}`;

export type Stage = "all" | "early" | "mid" | "late" | "birth" | "postpartum";
export const STAGES: Stage[] = ["all", "early", "mid", "late", "birth", "postpartum"];
export const isStage = (v: string | null | undefined): v is Stage => STAGES.includes(v as Stage);
export const STAGE_LABEL: Record<Lang, Record<Stage, string>> = {
  ja: { all: "いつでも", early: "妊娠初期（〜15週）", mid: "妊娠中期（16〜27週）", late: "妊娠後期（28週〜）", birth: "出産・入院", postpartum: "産後" },
  en: { all: "Any time", early: "1st trimester (–15w)", mid: "2nd trimester (16–27w)", late: "3rd trimester (28w–)", birth: "Birth & hospital stay", postpartum: "After birth" },
  zh: { all: "任何时期", early: "孕早期（〜15周）", mid: "孕中期（16〜27周）", late: "孕晚期（28周〜）", birth: "分娩・住院", postpartum: "产后" },
  ko: { all: "언제든지", early: "임신 초기（〜15주）", mid: "임신 중기（16〜27주）", late: "임신 후기（28주〜）", birth: "출산・입원", postpartum: "산후" },
  ru: { all: "В любое время", early: "1-й триместр (до 15 нед.)", mid: "2-й триместр (16–27 нед.)", late: "3-й триместр (с 28 нед.)", birth: "Роды и больница", postpartum: "После родов" },
};

export const HEADER: Record<Lang, { tagline: string; navi: string; columns: string; contact: string; switcher: string }> = {
  ja: { tagline: "次にやることが、すぐわかる", navi: "Tsugiraku Navi", columns: "負担軽減コラム", contact: "コンタクト", switcher: "言語" },
  en: { tagline: "Know your next step", navi: "Navi", columns: "Columns", contact: "Contact", switcher: "Language" },
  zh: { tagline: "马上知道下一步该做什么", navi: "Navi", columns: "专栏", contact: "联系", switcher: "语言" },
  ko: { tagline: "다음에 할 일을 바로 알 수 있다", navi: "Navi", columns: "칼럼", contact: "문의", switcher: "언어" },
  ru: { tagline: "Знайте свой следующий шаг", navi: "Navi", columns: "Статьи", contact: "Контакт", switcher: "Язык" },
};

export const LIST: Record<Lang, { title: string; lead: string; pr: string; none: string; all: string; filter: string; alsoIn: string }> = {
  ja: { title: "負担軽減コラム", lead: "妊娠・出産の手続きと準備の負担を軽くするための読みものです。周期（妊娠初期・中期・後期・出産・産後）で絞れます。制度の数字には出典と確認日を添え、製品を紹介するコラムは先頭に「PR」と明記します。", pr: "PR", none: "コラムはまだありません。", all: "すべて", filter: "周期で絞る", alsoIn: "ほかの言語" },
  en: { title: "Columns", lead: "Practical columns to lighten the load of pregnancy and childbirth paperwork in Tokyo, filterable by stage. Every figure links to its official source with the date we checked it. Columns that mention products are marked “PR” at the top.", pr: "PR", none: "No columns yet.", all: "All", filter: "Filter by stage", alsoIn: "Other languages" },
  zh: { title: "专栏", lead: "帮助减轻在东京怀孕、分娩相关手续与准备负担的文章，可按孕期筛选。所有制度数字都附有官方出处和核对日期。介绍商品的专栏在开头标明“PR”。", pr: "PR", none: "暂无专栏。", all: "全部", filter: "按孕期筛选", alsoIn: "其他语言" },
  ko: { title: "칼럼", lead: "도쿄에서의 임신·출산 관련 절차와 준비의 부담을 덜어 주는 글입니다. 시기별로 골라 볼 수 있습니다. 제도의 숫자에는 공식 출처와 확인일을 붙이고, 상품을 소개하는 칼럼은 첫머리에 “PR”이라고 밝힙니다.", pr: "PR", none: "아직 칼럼이 없습니다.", all: "전체", filter: "시기로 고르기", alsoIn: "다른 언어" },
  ru: { title: "Статьи", lead: "Практические статьи о документах и подготовке к родам в Токио, с фильтром по сроку беременности. Каждая цифра ведёт на официальный источник с датой проверки. Статьи с товарами помечены «PR» в начале.", pr: "PR", none: "Статей пока нет.", all: "Все", filter: "Фильтр по сроку", alsoIn: "Другие языки" },
};

export const ARTICLE: Record<Lang, { pr: string; prBody: string; sources: string; checked: string; published: string; updated: string; back: string; readIn: string; disclaimer: string; navi: string }> = {
  ja: { pr: "PR・広告を含みます", prBody: "この記事には製品の紹介とアフィリエイトリンクが含まれます。リンク先で購入があると、運営に紹介料が入ることがあります。紹介料の有無で、手続きの案内や病院の情報は変わりません。", sources: "出典", checked: "確認日", published: "公開", updated: "更新", back: "コラムの一覧へ", readIn: "ほかの言語で読む", disclaimer: "この記事は手続きと準備の案内です。医療の判断はしません。最終確認は窓口・医療機関へ。", navi: "あなたの「次にやること」を見る" },
  en: { pr: "Contains PR / affiliate links", prBody: "This article mentions products and contains affiliate links. If you buy through them, Tsugiraku may receive a commission. Commissions never change the procedure guidance or the hospital information we show.", sources: "Sources", checked: "checked", published: "Published", updated: "Updated", back: "All columns", readIn: "Read in another language", disclaimer: "This article explains paperwork and preparation. It is not medical advice. Please confirm with your ward office or your clinic.", navi: "See your next step in the Navi" },
  zh: { pr: "含 PR・广告", prBody: "本文含商品介绍和联盟链接。通过链接购买时，运营方可能获得佣金。佣金不会改变手续指南和医院信息。", sources: "出处", checked: "核对日期", published: "发布", updated: "更新", back: "返回专栏列表", readIn: "用其他语言阅读", disclaimer: "本文是关于手续与准备的说明，不提供医疗判断。最终请向区役所窗口或医疗机构确认。", navi: "在 Navi 中查看你的下一步" },
  ko: { pr: "PR·광고 포함", prBody: "이 글에는 상품 소개와 제휴 링크가 포함되어 있습니다. 링크를 통해 구매하면 운영자에게 수수료가 들어올 수 있습니다. 수수료 여부로 절차 안내나 병원 정보가 바뀌지는 않습니다.", sources: "출처", checked: "확인일", published: "공개", updated: "갱신", back: "칼럼 목록으로", readIn: "다른 언어로 읽기", disclaimer: "이 글은 절차와 준비에 관한 안내입니다. 의료적 판단은 하지 않습니다. 최종 확인은 구청 창구·의료기관에서 하세요.", navi: "Navi에서 내 다음 할 일 보기" },
  ru: { pr: "Содержит PR / партнёрские ссылки", prBody: "В статье упоминаются товары и есть партнёрские ссылки. При покупке по ним оператор может получить комиссию. Комиссия никак не влияет на описание процедур и информацию о больницах.", sources: "Источники", checked: "проверено", published: "Опубликовано", updated: "Обновлено", back: "Все статьи", readIn: "Читать на другом языке", disclaimer: "Эта статья — о документах и подготовке. Это не медицинская консультация. Уточняйте в администрации района и в клинике.", navi: "Посмотреть свой следующий шаг в Navi" },
};

/** アフィリエイトの仕組みごとに、規約が求める文言 */
export const PROGRAM_TEXT: Record<Lang, Record<string, string>> = {
  ja: { amazon: "Amazonのアソシエイトとして、Tsugirakuは適格販売により収入を得ています。", rakuten: "楽天アフィリエイトのリンクを含みます。", yahoo: "Yahoo!ショッピングのアフィリエイトリンクを含みます。", other: "アフィリエイトサービスのリンクを含みます。" },
  en: { amazon: "As an Amazon Associate, Tsugiraku earns from qualifying purchases.", rakuten: "Contains Rakuten affiliate links.", yahoo: "Contains Yahoo! Shopping affiliate links.", other: "Contains affiliate links." },
  zh: { amazon: "作为 Amazon 联盟成员，Tsugiraku 通过符合条件的购买获得收入。", rakuten: "含乐天联盟链接。", yahoo: "含 Yahoo! 购物联盟链接。", other: "含联盟服务链接。" },
  ko: { amazon: "Amazon 어소시에이트로서 Tsugiraku는 적격 판매를 통해 수입을 얻습니다.", rakuten: "라쿠텐 제휴 링크가 포함되어 있습니다.", yahoo: "Yahoo! 쇼핑 제휴 링크가 포함되어 있습니다.", other: "제휴 서비스 링크가 포함되어 있습니다." },
  ru: { amazon: "Как участник партнёрской программы Amazon, Tsugiraku получает доход от соответствующих покупок.", rakuten: "Содержит партнёрские ссылки Rakuten.", yahoo: "Содержит партнёрские ссылки Yahoo! Shopping.", other: "Содержит партнёрские ссылки." },
};

/** 中国語・韓国語・ロシア語のページで、英語のページ（情報が多い）を案内する */
export const ENGLISH_HINT: Partial<Record<Lang, string>> = {
  zh: "更详细的内容请看英文页面（English）。",
  ko: "더 자세한 내용은 영어 페이지(English)를 보세요.",
  ru: "Более подробная информация — на английской странице (English).",
};

export type HomeText = {
  chip: string; h1a: string; h1b: string; lead: string; navi: string; columns: string; naviNote: string;
  promises: string; promise: { title: string; body: string }[];
  how: string; steps: { title: string; body: string }[];
  coverage: string; coverageBody: (n: number, contact: string) => string;
  columnsTitle: string; allColumns: string; operator: string; operatorBody: (contact: string) => string; terms: string; policy: string;
};

export const HOME: Record<Exclude<Lang, "ja">, HomeText> = {
  en: {
    chip: "For families expecting a baby in Tokyo's 23 wards",
    h1a: "Pregnancy paperwork in Tokyo:", h1b: "know your next step.",
    lead: "Ward office forms, hospital booking deadlines, the money you can claim. Instead of searching everything separately, Tsugiraku shows the one thing you need to do now, with its official source.",
    navi: "Open Tsugiraku Navi (Japanese)", columns: "Read the columns in English",
    naviNote: "The Navi itself is in Japanese for now. The columns in your language explain what it does and the paperwork you will meet, so you can use it with a translation tool or a Japanese-speaking partner. Screens in other languages are planned.",
    promises: "What we promise",
    promise: [
      { title: "Every figure has a source and a check date", body: "Each number links to the official page of your ward, Tokyo or the national government, with the date we last checked it. Anything without a source cannot be published — the system refuses it." },
      { title: "No name, no login", body: "What you enter stays in your own browser. We never handle check-up results or photos. You can see what is stored, and erase it, at any time." },
      { title: "No medical advice", body: "We cover paperwork, deadlines and money only. For anything about your health, talk to your clinic. Every screen says so." },
    ],
    how: "How it works",
    steps: [
      { title: "Enter four things", body: "Your ward, your due date, your preferences (epidural, distance) and the papers you already hold. About a minute." },
      { title: "See one next step", body: "Pregnancy notification, handbook, hospital booking, subsidies… We highlight the single thing to do now, with its deadline and source." },
      { title: "Hospitals, deadlines and money", body: "Where you can give birth in your ward, their published booking deadlines, and fee − lump sum − subsidies = your estimated cost." },
    ],
    coverage: "Coverage",
    coverageBody: (n, c) => `The 23 wards of Tokyo (${n} wards): national, Tokyo and ward procedures, plus every facility in each ward where you can give birth. Other municipalities are not covered yet — requests to ${c}.`,
    columnsTitle: "Columns", allColumns: "All columns", operator: "Who runs this",
    operatorBody: (c) => `Tsugiraku Office (an individual operator). We watch every official page we cite once a week; when one changes, a person reads it before we update anything. Found a mistake? Use “report an error” on any screen, or write to ${c}.`,
    terms: "Terms (Japanese)", policy: "Privacy policy (Japanese)",
  },
  zh: {
    chip: "写给住在东京23区、正在孕育宝宝的家庭",
    h1a: "东京的怀孕・分娩手续：", h1b: "马上知道下一步。",
    lead: "区役所的申请、分娩预约的截止日、可以领取的补助。不用分头去查，Tsugiraku 只告诉你现在该做的那一件事，并附上官方出处。",
    navi: "打开 Tsugiraku Navi（日语）", columns: "阅读中文专栏",
    naviNote: "Navi 本身目前只有日语。中文专栏会说明它能做什么、你将遇到哪些手续，方便你借助翻译工具或会日语的家人使用。其他语言的界面正在计划中。",
    promises: "我们的承诺",
    promise: [
      { title: "每个数字都有出处和核对日期", body: "每个数字都链接到区、东京都或国家的官方页面，并标明我们最后核对的日期。没有出处的信息无法发布——系统会拒绝。" },
      { title: "不需要姓名，不需要登录", body: "你输入的内容只保存在自己的浏览器里。我们不处理产检结果和照片。随时可以查看保存了什么并删除。" },
      { title: "不做医疗判断", body: "我们只涉及手续、期限和费用。关于身体的问题，请咨询医疗机构。每个页面都有这句话。" },
    ],
    how: "使用方法",
    steps: [
      { title: "输入四项", body: "居住的区、预产期、你的希望（无痛分娩、距离）、手头已有的文件。大约一分钟。" },
      { title: "显示下一步", body: "妊娠届、母子手册、分娩预约、补助申请……只突出显示现在该做的一件事，并附上期限和出处。" },
      { title: "医院、截止日和费用", body: "本区可以分娩的医院、公布的预约截止周，以及 费用 − 一次性补助金 − 补助 = 你的自付估算。" },
    ],
    coverage: "覆盖范围",
    coverageBody: (n, c) => `东京23区（${n}个区）：国家、东京都和各区的手续，以及各区所有可分娩的医院。其他市区町村暂未覆盖，如有需要请发邮件至 ${c}。`,
    columnsTitle: "专栏", allColumns: "全部专栏", operator: "运营者",
    operatorBody: (c) => `Tsugiraku 事务局（个人运营）。我们每周自动检查所引用的官方页面，有变化时由人工确认后再更新。发现错误请使用各页面的“报告错误”，或发邮件至 ${c}。`,
    terms: "使用条款（日语）", policy: "隐私政策（日语）",
  },
  ko: {
    chip: "도쿄 23구에 사는 임산부와 가족에게",
    h1a: "도쿄에서의 임신·출산 절차,", h1b: "다음 할 일을 바로 알 수 있습니다.",
    lead: "구청 신고, 분만 예약 마감, 받을 수 있는 돈. 따로따로 찾지 않아도, 지금 당신에게 필요한 ‘다음 할 일’ 하나를 공식 출처와 함께 보여 줍니다.",
    navi: "Tsugiraku Navi 열기（일본어）", columns: "한국어 칼럼 읽기",
    naviNote: "Navi 본체는 아직 일본어입니다. 한국어 칼럼에서 Navi가 무엇을 하는지, 어떤 절차를 만나게 되는지 설명하므로 번역 도구나 일본어를 아는 가족과 함께 쓸 수 있습니다. 다른 언어 화면은 준비 중입니다.",
    promises: "지키고 있는 것",
    promise: [
      { title: "모든 숫자에 출처와 확인일", body: "화면의 숫자마다 구·도쿄도·국가의 공식 페이지 링크와 마지막으로 확인한 날짜를 붙입니다. 출처가 없는 정보는 시스템이 게재를 거부합니다." },
      { title: "이름도 로그인도 필요 없음", body: "입력한 내용은 본인의 브라우저에만 저장됩니다. 검진 결과나 사진은 다루지 않습니다. 무엇이 저장되어 있는지 언제든 확인하고 지울 수 있습니다." },
      { title: "의료적 판단은 하지 않음", body: "절차·기한·돈에 관한 안내만 합니다. 몸 상태는 의료기관에 상담하세요. 모든 화면에 이 문구가 있습니다." },
    ],
    how: "사용 방법",
    steps: [
      { title: "네 가지 입력", body: "사는 구, 출산 예정일, 희망 사항(무통분만·거리), 지금 갖고 있는 서류. 약 1분." },
      { title: "다음 할 일 하나가 나옴", body: "임신신고, 모자수첩, 분만 예약, 보조금 신청… 지금 할 한 가지만 강조해 기한과 출처를 붙입니다." },
      { title: "병원·마감·돈", body: "구 안에서 출산할 수 있는 시설, 공표된 예약 마감 주수, 비용 − 일시금 − 보조금 = 실제 부담 추정." },
    ],
    coverage: "대상 지역",
    coverageBody: (n, c) => `도쿄 23구(${n}개 구): 국가·도쿄도·각 구의 절차와, 각 구에서 출산할 수 있는 모든 시설. 다른 시구정촌은 준비 중입니다. 요청은 ${c} 로.`,
    columnsTitle: "칼럼", allColumns: "모든 칼럼", operator: "운영",
    operatorBody: (c) => `Tsugiraku 사무국(개인 운영). 인용한 공식 페이지를 매주 자동으로 감시하고, 바뀌면 사람이 확인한 뒤 갱신합니다. 오류를 발견하면 각 화면의 ‘오류 알리기’ 또는 ${c} 로 알려 주세요.`,
    terms: "이용약관（일본어）", policy: "개인정보 처리방침（일본어）",
  },
  ru: {
    chip: "Семьям, ожидающим ребёнка в 23 районах Токио",
    h1a: "Документы при беременности в Токио:", h1b: "знайте свой следующий шаг.",
    lead: "Заявления в районную администрацию, сроки записи в роддом, выплаты, которые можно получить. Вместо поиска по частям Tsugiraku показывает одно действие, которое нужно сделать сейчас, — с официальным источником.",
    navi: "Открыть Tsugiraku Navi (на японском)", columns: "Читать статьи на русском",
    naviNote: "Сам Navi пока только на японском. Статьи на русском объясняют, что он делает и какие документы вас ждут, чтобы пользоваться им с переводчиком или с партнёром, знающим японский. Экраны на других языках планируются.",
    promises: "Что мы обещаем",
    promise: [
      { title: "У каждой цифры есть источник и дата проверки", body: "Каждая цифра ведёт на официальную страницу района, Токио или государства, с датой последней проверки. Информацию без источника система не публикует." },
      { title: "Без имени и без входа", body: "Введённые данные хранятся только в вашем браузере. Мы не работаем с результатами обследований и фотографиями. Что сохранено — можно посмотреть и стереть в любой момент." },
      { title: "Никаких медицинских советов", body: "Только документы, сроки и деньги. По вопросам здоровья — в клинику. Об этом написано на каждом экране." },
    ],
    how: "Как это работает",
    steps: [
      { title: "Введите четыре вещи", body: "Район, предполагаемую дату родов, пожелания (эпидуральная анестезия, расстояние) и документы, которые уже есть. Около минуты." },
      { title: "Увидите один следующий шаг", body: "Уведомление о беременности, «Босидзу течо», запись в роддом, пособия… Мы выделяем одно действие с его сроком и источником." },
      { title: "Роддома, сроки и деньги", body: "Где в вашем районе можно рожать, их объявленные сроки записи, и стоимость − единовременное пособие − субсидии = ваша ориентировочная доплата." },
    ],
    coverage: "Охват",
    coverageBody: (n, c) => `23 района Токио (${n}): процедуры государства, Токио и районов, а также все роддома каждого района. Другие муниципалитеты пока не охвачены — запросы на ${c}.`,
    columnsTitle: "Статьи", allColumns: "Все статьи", operator: "Кто это делает",
    operatorBody: (c) => `Офис Tsugiraku (частный оператор). Раз в неделю мы автоматически проверяем каждую цитируемую официальную страницу; если она изменилась, человек читает её до обновления. Нашли ошибку? Нажмите «сообщить об ошибке» на любом экране или напишите на ${c}.`,
    terms: "Условия (на японском)", policy: "Политика конфиденциальности (на японском)",
  },
};
