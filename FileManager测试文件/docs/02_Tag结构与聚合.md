# 02 Tag 结构与聚合

## 目标

验证父 Tag 默认结构模式和显式聚合模式。

## 结构模式测试

1. 打开 `技术` Tag 页面。
2. 默认应进入结构模式。
3. 检查直接子 Tag。
4. 检查直接文件。

预期：

- 当前 Tag：`技术`
- 直接子 Tag：`大模型`、`数据库`、`待研究`
- 直接文件：`技术资料总览.md`
- 不应直接显示 `RAG 系统设计方案.pdf`、`向量数据库选型对比.md` 等后代 Tag 文件。

## 聚合模式测试

1. 在 `技术` Tag 页面切换到聚合模式。
2. 检查全部后代命中文件。
3. 检查文件去重和 matchedTags。

聚合结果至少包含：

- `技术资料总览.md`，当前命中：`技术`
- `RAG 系统设计方案.pdf`，当前命中：`RAG`
- `向量数据库选型对比.md`，当前命中：`向量数据库`
- `Embedding 模型评测.xlsx`，当前命中：`Embedding`
- `大模型应用架构图.png`，当前命中：`大模型`
- `本地知识库开发记录.md`，当前命中：`RAG`

## 去重测试

`RAG 系统设计方案.pdf` 同时属于：

- `技术/大模型/RAG`
- `项目/File Manager`

在 `技术` 聚合页中，它只能出现一次。

## 计数规则

- 结构模式：`totalDirectFileCount = directFiles.length`，`totalAggregateFileCount = null`。
- 聚合模式：`totalAggregateFileCount = 去重后的 aggregateFiles.length`。

## 空状态测试

打开 `技术/待研究`：

- 直接子 Tag：0
- 直接文件：0
- 聚合文件：0
- 页面显示空状态，不报错。
