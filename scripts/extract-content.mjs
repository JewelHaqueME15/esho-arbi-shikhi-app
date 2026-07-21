/* এককালীন স্ক্রিপ্ট — বর্তমান js/ ফাইল থেকে সব কন্টেন্ট বের করে content/ ফোল্ডারে
   সম্পাদনাযোগ্য JSON ফাইল বানায়। আরবি লেখা হাতে টাইপ করা হয় না, কোড থেকেই নেওয়া
   হয় — তাই একটি অক্ষরও বদলায় না। একবার চালানোর পর আর দরকার নেই, তবু ইতিহাসের
   জন্য রেখে দেওয়া হলো। */
import fs from "node:fs";
import path from "node:path";
import { UNITS, STORIES, SECTIONS, BOOK_ORDER } from "../js/data.js";
import { LEARN } from "../js/lessons.js";
import { ICONS } from "../js/icons.js";

const ROOT = path.join(process.cwd(), "content");
const LDIR = path.join(ROOT, "lessons");
const SDIR = path.join(ROOT, "stories");
fs.mkdirSync(LDIR, { recursive: true });
fs.mkdirSync(SDIR, { recursive: true });

/* বইয়ের ক্রম অনুযায়ী প্রতিটি পাঠের ছোট ইংরেজি নাম — ফাইল খুঁজে পেতে সুবিধা */
const SLUGS = [
  "hadha-dhalika", "hadhihi-tilka", "sifat", "pronouns", "al-definite",
  "family-possessive", "nida", "idafa", "ayna-places", "fi",
  "city-travel", "weapons-kitchen", "food", "nature", "professions",
  "fruits", "animals", "body", "sentence-building", "past-tense",
  "prepositions", "present-future", "imperative", "negation", "answer-particles",
  "masdar", "verb-object", "object-pronouns", "hollow-verbs", "bab-ifal",
  "purpose-intent", "kana-sara-laysa", "defective-verbs", "plural-things", "plural-people",
  "numbers", "comparison", "relative-conditional", "quran-hadith",
];
if (SLUGS.length !== UNITS.length) throw new Error(`slug count ${SLUGS.length} != units ${UNITS.length}`);

const pad = (n) => String(n).padStart(2, "0");
const order = [];

UNITS.forEach((u, i) => {
  const name = `${pad(i + 1)}-${SLUGS[i]}`;
  order.push(name);
  const lesson = {
    id: u.oldId,                 // স্থায়ী পরিচয় — অগ্রগতি ও ব্যাখ্যার সাথে মিল রাখে
    title: u.title,
    sub: u.sub,
    icon: u.icon,
    tip: u.tip,
    // ব্যাখ্যাটি লাইনে ভাগ করে রাখা হয় যাতে JSON-এ পড়া ও এডিট করা সহজ হয়
    learn: String(LEARN[u.oldId] ?? "").split("\n"),
    vocab: u.vocab,
    sents: u.sents,
  };
  if (u.qa) lesson.qa = u.qa;
  if (u.fill) lesson.fill = u.fill;
  fs.writeFileSync(path.join(LDIR, name + ".json"), JSON.stringify(lesson, null, 2) + "\n");
});

/* গল্প — afterId অ্যাপে নতুন অবস্থান, ফাইলে স্থায়ী পাঠ-আইডি হিসেবে রাখা হয় */
STORIES.forEach((s, i) => {
  const story = {
    id: s.id,
    afterLessonId: BOOK_ORDER[s.afterId],
    icon: s.icon,
    title: s.title,
    sub: s.sub,
    lines: s.lines,
  };
  fs.writeFileSync(path.join(SDIR, `${pad(i + 1)}-${s.id}.json`), JSON.stringify(story, null, 2) + "\n");
});

fs.writeFileSync(path.join(ROOT, "book.json"), JSON.stringify({
  note: "পাঠের ক্রম ও অধ্যায়। order-এ ফাইলের নাম বইয়ের ক্রমে সাজানো — এখানে ক্রম বদলালে অ্যাপেও বদলাবে।",
  order,
  sections: SECTIONS,
}, null, 2) + "\n");

fs.writeFileSync(path.join(ROOT, "icons.json"), JSON.stringify({
  note: "শব্দ-তালিকার ছবি-কলামে দেখানো আইকন। ক্রিয়াপদে ইচ্ছাকৃতভাবে আইকন নেই।",
  icons: ICONS,
}, null, 2) + "\n");

console.log(`wrote ${UNITS.length} lessons, ${STORIES.length} stories, book.json, icons.json`);
