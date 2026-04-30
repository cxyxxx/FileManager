# 03 搜索与 Saved Query

## 目标

验证文件名、摘要、Tag 和查询保存能力。

## 搜索用例

| 搜索词 | 预期命中 |
|---|---|
| RAG | `RAG 系统设计方案.pdf`、`本地知识库开发记录.md` |
| Qdrant | `向量数据库选型对比.md` |
| 本地知识库 | `RAG 系统设计方案.pdf`、`本地知识库开发记录.md` |
| GPU server | `云服务账单.pdf`、`采购合同.pdf` |
| get_tag_page_data | `后端接口设计.md` |
| 报销 | `报销说明.docx`、`2026-04 发票.pdf` |
| 不存在的关键词XYZ | 空结果 |

## Saved Query 用例

创建 3 个 Saved Queries：

1. `File Manager 后端资料`：Tag 包含 `项目/File Manager/后端` 或关键词 `后端`。
2. `本地知识库相关`：关键词 `本地知识库` 或 Tag 包含 `RAG`。
3. `财务文件`：Tag 包含 `财务`。

## 验收

- 搜索结果可进入文件详情页。
- 从文件详情页修改摘要或 Tag 后，再回到搜索结果，数据应刷新。
- Saved Query 重启后仍存在。
- 删除 Saved Query 不影响原始文件、摘要和 Tag。

如果当前版本尚不支持全文索引，则本流程只要求验证文件名、摘要和 Tag 搜索。正文搜索可标记为 P2。
