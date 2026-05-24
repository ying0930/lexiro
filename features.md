# Wordmem 專案功能完整說明文檔

本文檔詳細記錄了 Wordmem 專案的各項功能與系統架構，為後續從頭重寫（Rewrite）或架構升級提供完整的參考。

## 1. 核心系統設定與技術棧 (Tech Stack)

*   **前端框架**：Vue 3 (採用 Composition API 與 `<script setup>` 語法)
*   **建置工具**：Vite
*   **樣式處理**：Tailwind CSS v4 (搭配自行客製化的 UI 元件庫如 shadcn-vue 風格：Button, Card, Badge, Dialog, Progress 等)
*   **本地資料儲存**：依賴 `localStorage` 來達成狀態持久化（儲存單字集、練習紀錄等），無須後端資料庫。
*   **PWA (漸進式網頁應用)**：使用 `vite-plugin-pwa` 支援離線快取 (Workbox) 與安裝至手機/桌面主畫面。
*   **壓縮處理**：引入 `fflate` 來進行資料的 ZIP 壓縮與解壓縮（用於匯出與匯入）。

## 2. 核心功能：單字集管理 (Set Management)

應用程式的核心資料為「單字集 (Sets)」，包含以下主要管理功能：

*   **首頁儀表板 (Home Dashboard)**
    *   展示所有建立的單字集（名稱、包含的單字數量）。
    *   若首次進入或無單字集時，具有空狀態 (Empty State) 畫面，引導使用者新增或匯入。
    *   卡片式介面提供以下快速操作按鈕：單字卡、選擇練習、拼字測試、編輯單字集、刪除單字集。
*   **新增與編輯單字集 (Create / Edit Sets)**
    *   彈出對話窗 (`SetEditorDialog.vue`) 以表單形式管理單字。
    *   每個單字 (Item) 具有以下欄位：
        *   `word` (英文單字)
        *   `pos` (詞性，如 n., v., adj.)
        *   `meaning` (中文解釋/字義)
        *   `example` (例句)
        *   `question` (為單字專屬設計的四選一測驗題，包含題幹 prompt、四個選項 opts、正確答案索引 ans)。
    *   支援欄位驗證（必填檢查、確保選項數量一致）。
*   **刪除功能 (Delete)**
    *   刪除單字集時設有防呆對話框 (`ConfirmDialog.vue`)，防止誤刪。

## 3. 學習與測驗模式 (Learning & Practice Modes)

提供三種單字學習的核心模式，並針對大量測驗支援了漸進式渲染 (Infinite/Intersection Observer Rendering) 以優化效能：

1.  **單字卡模式 (Flashcards)**
    *   純粹的瀏覽與記憶模式，無須作答。
    *   提供正反面的翻頁/滑動學習體驗，用以快速檢閱字義與例句。
2.  **選擇題測驗 (Quiz Practice)**
    *   讀取單字內建的四選一測驗題進行測驗。
    *   在開始測驗前，可透過對話框 (`PracticeDialog.vue`) 設定目標題數，或者重點複習過去錯題比例較高的字彙。
    *   具備上方進度條 (Progress Bar) 顯示當前已作答與未作答題數。
    *   一次作答完畢後，點擊「送出本輪答案」進行批次結算。
3.  **拼字測試 (Spelling Practice)**
    *   提供單字的中文意義與例句作為「提示」。
    *   要求使用者透過輸入框 (Input) 直接拼寫出正確的英文單字。
    *   同樣支援批次提交與上方進度追蹤。

## 4. 測驗結果與檢討 (Results & Review)

在測驗完成後會導向「結果頁面」 (`ResultView.vue`)，提供完整的檢討機制：

*   **成績結算板**：計算總得分，並清楚標示答對題數與答錯題數。
*   **單題對照檢查**：列表列出使用者的作答與正確答案的比對，利用綠色/紅色清楚標示答對或答錯。
*   **錯題複習機制**：
    *   **再練一次**：重新開始該單字集的完整測驗。
    *   **複習錯題 (Review Wrong Answers)**：系統自動抓出本輪的錯題，並直接重啟新的測驗輪次，只針對錯題演練。
    *   **模式切換**：考完選擇題可以直接切換為同範圍的拼字測試。
*   **AI 詳解整合 (AI Explanations Prompt Generation)**：
    *   **複製錯題 AI 解析**：一鍵將所有的錯題資訊打包成 Prompt，複製到剪貼簿中。
    *   **單題 AI 詳解**：單題也能單獨複製發問 Prompt。
    *   此功能方便使用者將 Prompt 貼給 ChatGPT / Claude 等 AI 工具，取得文法解釋或記憶訣竅。

## 5. 資料備份與轉移 (Data Backup, Import & Export)

為解決 `localStorage` 容量限制或跨裝置同步問題，提供強大的匯入匯出系統：

*   **文字 / JSON 匯入 (Text Import)**
    *   支援直接貼上 JSON 格式的單字集資料，並能選擇「追加(Append)」或「覆蓋」現有資料。
*   **ZIP 檔案備份與匯入 (Local ZIP Backup/Import)**
    *   可將使用者選定的單字集打包成單一 `.zip` 檔輸出到本地電腦（使用 `fflate` 實作）。
    *   可以經由檔案選擇器匯入該 ZIP 檔還原單字集。
*   **Google Drive 雲端同步 (Google Drive Integration)**
    *   串接 Google Identity Services (OAuth 2.0)。
    *   使用者可登入並授權應用程式存取特定的 Google Drive 範圍 (`https://www.googleapis.com/auth/drive.file`)。
    *   **雲端備份**：將選擇的單字集壓成 ZIP 後上傳至 Drive 的 `Wordmem` 資料夾下。
    *   **智慧清理**：自動偵測並刪除雲端舊檔案，預設只保留最新的 10 份備份紀錄，節省空間。
    *   **雲端還原**：可以直接在系統列表看到 Drive 上的歷史備份檔，並點擊一鍵還原回應用程式。

## 6. 其他 UI/UX 特性

*   **RWD 響應式佈局 (Responsive Design)**：支援手機端與電腦端，操作介面皆有自適應設計（例如：表單、按鈕群組）。
*   **深淺色主題 (Dark / Light Mode)**：提供切換深色模式與淺色模式的功能。
*   **Toast 通知系統**：各項操作（存檔成功、複製成功、匯入錯誤等）皆有右下的 Toast 彈出式小提示。
*   **防暫停機制與虛擬載入**：對長列表採用 `IntersectionObserver` 進行條件式動態加載 (`renderLimit`)，避免百題以上卡頓。

---
*本文檔依據目前原始碼之架構整理，為完整功能的盤點與總結。*