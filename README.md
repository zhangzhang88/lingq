# LingQ Clone

一个使用 React + Vite 搭建的简化版 LingQ 体验，包含阅读模式、学习模式、单词弹窗、翻译缓存、课程分组等功能。项目中已经内置了两套课程：

- **The Seven Secrets to Successful Language Learning**（7 课）
- **Mini Stories**（60 课）

所有课程和词汇数据默认保存在浏览器 `localStorage` 中，因此你可以自由导入/导出、修改或新增默认课程。

---

## 快速开始

```bash
npm install
npm run dev
```

- 本地开发地址默认为 <http://localhost:5173>
- 生产构建：`npm run build`
- 预览生产包：`npm run preview`

Node 版本建议 ≥ 18。

---

## 项目结构（核心部分）

```
src/
├─ components/
│  └─ TextRenderer.jsx          # 阅读器，负责单词弹窗、翻译等
├─ context/
│  ├─ ArticleContext.jsx        # 文章（课程）状态，持久化到 localStorage
│  ├─ SettingsContext.jsx       # 用户设置（翻译接口、主题等）
│  └─ VocabularyContext.jsx     # 词汇熟悉度、翻译缓存
├─ pages/
│  ├─ Library.jsx               # 首页课程列表，支持课程分组
│  ├─ Course.jsx                # 单个课程下的课时列表
│  ├─ Reader.jsx                # 阅读/学习模式页面
│  ├─ Import.jsx                # 制作课程（手动录入）
│  └─ Review.jsx                # 复习模式
├─ store/
│  ├─ mockData.js               # 默认课程（包含 Seven Secrets + Mini Stories）
│  └─ miniStories.js            # Mini Stories 60 课的文本
└─ utils/
   ├─ articleStats.js           # 统计词汇/句子数量
   ├─ dataBackup.js             # 导出/导入 localStorage 数据
   └─ sentenceCache.js          # 学习模式句子翻译缓存
```

---

## 用户使用说明

1. **首次进入首页**会看到课程卡片；点击卡片进入课程，选择任意课即可进入阅读/学习。
2. **阅读模式**可以选择阅读与学习模式、切换“纯净模式”（仅文字）、手动翻译等。
3. **单词弹窗**支持播放、翻译、记忆阶段（1~5）以及句子翻译。
4. **Mini Stories 与其他课程**的数据都保存在浏览器 `localStorage`。如果你曾经导入过自己的课程，刷新后仍然优先加载本地数据；想恢复默认数据，可在浏览器 Console 输入：
   ```js
   localStorage.removeItem('lingq_articles');
   location.reload();
   ```
5. **导出/导入学习数据**：在首页（Library）顶部的提示卡片里点击“导出数据”即可备份所有课程、词汇、翻译缓存与设置；“导入数据”可恢复或迁移到另一台机器。

---

## 后台新增课程（显示在首页）

默认课程由 `src/store/mockData.js` 控制。添加新课程需要以下步骤：

1. **准备文本**  
   - 建议使用独立 `.txt` 文件存放课程，每个文件的第一行作为标题，后面为正文。
   - 参考 `src/store_1/` 中 60 个 Mini Stories 的示例。

2. **生成课程数据**（推荐）  
   - 参考 `src/store/miniStories.js` 的结构，每篇文章包含：
     ```js
     {
       id: 999,                   // 唯一 ID
       title: 'Lesson Title',
       language: 'English',
       level: 'Beginner',
       courseId: 'course-key',    // 课程 ID（同一课程共享）
       courseTitle: 'Course Name',// 课程名称
       image: 'https://...png',   // 封面
       content: `文章正文`
     }
     ```
   - 可以编写脚本批量读取 txt 生成 JS 文件，Mini Stories 目录提供了一个示例脚本（见 `npm run build` 前的 Node 命令）。

3. **在 `mockData.js` 中注册课程**  
   - 引入你的新数据，例如：
     ```js
     import { myCourse } from './myCourseData';
     ```
   - 将 `mockArticles` 修改为：
     ```js
     export const mockArticles = [
       ...sevenSecretsArticles,
       ...miniStories,
       ...myCourse
     ];
     ```

4. **在课程卡片中显示课程信息**  
   - 首页 `Library.jsx` 会根据 `courseId` 自动分组；相同 `courseId` 的文章会汇总成一个课程卡片。
   - 每篇文章会继承自己的语言、等级信息，课程封面显示 `image`。

5. **刷新默认数据**  
   - 如果浏览器已有旧数据，请清空 `localStorage` 中的 `lingq_articles` 后刷新，才能加载新的默认课程。

---

## 词汇与翻译缓存的持久化

- 词汇熟悉度、手动翻译保存在 `lingq_vocabulary`
- 自动翻译缓存保存在 `lingq_translation_cache`
- 句子翻译缓存保存在 `sessionStorage` 的 `lingq_sentence_translation_cache`
- 已完成句子进度存储在 `lingq_article_progress`

可以通过 `dataBackup.js` 的导出/导入按钮一次性备份或恢复这些数据。

---

## 常见问题

- **看不到新增课程？**  
  清空 `localStorage` 的 `lingq_articles` 并刷新，或用“导出/导入”功能重置数据。

- **翻译接口不可用？**  
  在阅读页的“翻译设置”里选择接口并点击“验证 API”按钮；可选择默认免费接口或自定义 DeepSeek API。

- **暗黑模式切换无效？**  
  确认导航栏右侧的主题按钮是否生效；主题偏好会保存到 `SettingsContext` 中的 `theme` 字段。

---

欢迎在此基础上继续扩展，例如接入真实后端、更多语言课程、统计图表等。若要贡献代码，请遵循项目现有的代码风格（Vite + React + Tailwind 4）。祝学习愉快！💪



把课程数据，保存在文件夹（store_1）的txt后，再跟AI对话：例如

首页我需要增加1个课程名称叫： Mini Stories，点击进入才是这60个课程放在这个文件夹下面/Users/world/Downloads/code/lingq/src/store_1，下面有60个课程，语言：英语 等级：初级，图片：https://pub-8d9c7b440bdc4316a94cd1a6ec45d0ce.r2.dev/lingq.png，同样里面的60个课程，每个课程的图片中间加上对应的数字水印的效果

/Users/world/Downloads/code/lingq/src/store_1这里面有60个txt，每个txt里面有一篇文章的标题和内容，为什么没有出现在我网页里面http://localhost:5173/course/mini-stories ，这里打开里面的60个课程后，是空的，没数据