# File Manager 测试包 v1

本测试包用于验证 File Manager 的核心工作流：导入文件、写摘要、加 Tag、父 Tag 结构模式、聚合模式、去重、命中 Tag、搜索、Saved Query、重复文件、版本更新、Tag 维护、重启持久化和边界文件处理。

## 目录说明

- `docs/`：测试计划、流程、验收清单。
- `test-dataset/00_seed_real_content/`：主流程使用的真实内容样本。
- `test-dataset/01_duplicates_and_conflicts/`：重复、同名冲突、相似文件测试。
- `test-dataset/02_edge_cases/`：空文件、错误扩展名、损坏文件、长文件名、大文件等边界样本。
- `test-dataset/03_scale_samples/`：120 个 Markdown 文件，用于批量导入和小规模性能验证。
- `seed/`：建议 Tag 树和文件 Tag 绑定表。

## 建议执行顺序

1. `docs/01_P0_核心主流程.md`
2. `docs/02_Tag结构与聚合.md`
3. `docs/03_搜索与SavedQuery.md`
4. `docs/04_文件维护_重复与版本.md`
5. `docs/05_Tag维护.md`
6. `docs/06_回归验收清单.md`

注意：破坏性测试建议使用干净 workspace 或从主流程完成后的数据库快照恢复。
