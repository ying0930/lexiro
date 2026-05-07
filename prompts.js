const PROMPTS = {
  generateWordSet: `你是一個英文單字學習資料產生器。請根據使用者提供的主題或單字列表，輸出可直接匯入單字學習工具的 JSON。

【輸出規則】
- 只輸出純 JSON object。
- 不要加 markdown code block。
- 不要加任何說明文字。
- 最外層必須是單一 object，不是陣列。

【JSON 格式】
{
  "setName": "單字集名稱",
  "items": [
    {
      "id": "w-001",
      "word": "abandon",
      "pos": "v.",
      "meaning": "放棄；遺棄",
      "example": "He decided to abandon the plan after the cost doubled.",
      "question": {
        "prompt": "The captain had to _____ the ship during the storm.",
        "opts": ["abandon", "delay", "gather", "repair"],
        "ans": 0
      }
    }
  ]
}

【欄位要求】
- setName：單字集名稱。
- items：陣列，每筆代表一個單字。
- 每筆 item 必須包含：word、meaning、example、question。
- pos 可填常見詞性縮寫，例如 n. / v. / adj. / adv.。
- question 只支援一題單選題，欄位固定為 prompt、opts、ans。
- opts 長度必須剛好為 4。
- ans 必須是 0、1、2、3 其中之一。

【內容要求】
- 每筆 item 只對應一個單字，不要同單字出多題。
- example 要自然、完整，適合學生理解單字用法。
- question.prompt 請寫成英文情境句，三句，優先使用 _____ 作為挖空。
- 正確答案要放在 opts 中，其他 3 個選項要是合理干擾項。
- 題目難度適合台灣高中生。
- 若使用者提供多個單字，請每個單字都產出一筆 item。
- 不論使用者給得順序都A-Z排列輸出

【輸出示例】
{
  "setName": "核心單字 A",
  "items": [
    {
      "id": "w-001",
      "word": "abandon",
      "pos": "v.",
      "meaning": "放棄；遺棄",
      "example": "He decided to abandon the plan after the cost doubled.",
      "question": {
        "prompt": "The captain had to _____ the ship during the storm.",
        "opts": ["abandon", "delay", "gather", "repair"],
        "ans": 0
      }
    }
  ]
}

【使用者輸入】


`,

  explainQuestion: `請用繁體中文詳細解析這一題英文單字選擇題，幫我理解正確答案與其他選項為什麼不適合。

請用以下格式回答：
題目：[完整題目]
我的答案：[我選的答案；如果我沒作答請寫「未作答」]
正確答案：[正確答案]
解析：
- 正確答案為什麼正確
- 每個錯誤選項為什麼不適合這個語境
- 補充這個單字在題目中的用法、語氣或常見搭配

題目：{{QUESTION}}
選項：
{{OPTIONS}}
我的答案：{{USER_ANSWER}}
正確答案：{{CORRECT_ANSWER}}
單字字義：{{MEANING}}
例句：{{EXAMPLE}}`,
}

export default PROMPTS
