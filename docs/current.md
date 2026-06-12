# 当前工作

## 待办

- [x] 审查阶段三现有功能状态和入口复杂度。
- [x] 核对 README、`docs/plan.md`、`docs/roadmap.md` 中标签/工作区/操作历史边界是否一致。
- [x] 补充阶段三体验审查结论，明确下一阶段优先级。
- [x] 收口用户文档中的标签、工作区、撤销边界说明。
- [x] 使用 `nvm use v22` 运行验证。
- [x] 记录结果。

## 结果

- 新增 `docs/stage-three-review.md`，记录阶段三体验审查结论：标签和工作区已形成轻量管理能力，下一步不建议继续堆管理功能，建议进入命令面板第一版。
- 更新 `docs/plan.md`：同步标签系统完成状态、阶段三体验审查状态、工作区后续定位，以及暂缓批量改名、收件箱、文件夹管理。
- 更新 `docs/roadmap.md`：同步工作区第一版已提前完成，阶段四后续聚焦命令面板的打开、搜索和切换能力，暂不加入危险管理动作。
- 更新 `README.md`：补充操作历史边界说明，并增加阶段三体验审查文档入口。
- 验证通过：`source ~/.nvm/nvm.sh && nvm use v22 && pnpm test`，14 个测试文件、106 个测试通过。
- 验证通过：`source ~/.nvm/nvm.sh && nvm use v22 && pnpm verify`，包含 compile、test、lint、Chrome 构建、Firefox 构建和 manifest 检查。
- 验证通过：`git diff --check`。
- Chrome manifest 抽查通过：`permissions` 只有 `bookmarks`，不存在 `content_scripts`。
