const PROMPTS = {
  generateQuiz: `你是一個專業的英文單字測驗出題者。請根據下方「單字列表」中的每個單字，各出一題填空選擇題。

【輸出格式】
必須輸出「純 JSON 陣列」，不要有任何 markdown 標記（例如不要用 \`\`\`json 包裝）或說明文字。

格式：
[
  {
    "q": "題號. 一句包含 _____ 的英文句子",
    "opts": ["正確答案", "干擾選項1", "干擾選項2", "干擾選項3"],
    "ans": 0
  }
]

【欄位說明】
- q：題目句子，以「題號. 」開頭，用 _____（五個底線）標示填空位置。句子要有完整情境，長度約 2-4 句。
- opts：長度必須剛好為 4 的字串陣列。其中一個為正確答案，其餘為合理但錯誤的干擾選項。
- ans：正確答案在 opts 中的索引，值為 0、1、2 或 3。請隨機變化正確答案的位置，不要總是放在第一個。

【出題要求】
- 每個單字各出一題，情境自然流暢，避免生硬的定義式句子。
- 選項控制在 1-3 個英文單字（片語亦可）。
- 難度適合台灣高中生。

【單字列表】
[在此貼上你的單字列表，一行一個單字]

輸出範例：
[
  {
    "q": "1. The weather during our beach vacation was absolutely _____. It rained heavily every single day, so we had to stay inside the hotel.",
    "opts": ["frequent", "awful", "imaginative", "equal"],
    "ans": 1
  },
  {
    "q": "2. She has a strong _____ for music and practices piano for hours every day without getting tired.",
    "opts": ["passion", "weapon", "poverty", "surgery"],
    "ans": 0
  }
]`,

  analyzeMistakes: `我答錯了以下英文單字題目，請幫我詳細解析每一題的正確答案，並說明為什麼其他選項不適合：

---
{{MISTAKES}}
---

請用繁體中文解析，對每一題使用以下格式：

第 X 題：
題目：[將原題目完整列出]
正確答案：[正確單字] — [解釋為什麼這個選項正確，包含字義、用法、搭配情境]
- (A) [選項]：不適合，因為 [說明字義及其不適合本句的原因]
- (B) [選項]：不適合，因為 [同上]
- (C) [選項]：不適合，因為 [同上]
- (D) [選項]：不適合，因為 [同上]

請確保每一題的四個選項都有各自獨立的解釋，不要合併或省略。`
,

  analyzeQuestion: `我正在練習英文單字填空題，請幫我解析下面這一題，並用繁體中文說明正確答案與四個選項的差異。

請用以下格式回答：
第 X 題：
題目：[完整題目]
正確答案：[答案] — [為什麼正確]
- (A) ...：...
- (B) ...：...
- (C) ...：...
- (D) ...：...

題號：第 {{QUESTION_NUMBER}} 題
題目：{{QUESTION}}
選項：
{{OPTIONS}}
正確答案：{{ANSWER}}`
};
