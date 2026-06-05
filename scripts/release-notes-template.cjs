module.exports = {
  mainTemplate: `## v{{version}}{{#if date}} ({{date}}){{/if}}

{{#if previousTag}}
[查看完整变更]({{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}})
{{/if}}

### 安装包

- Chrome / Edge：下载 GitHub Release assets 中的 Chrome MV3 extension。
- Firefox：下载 GitHub Release assets 中的 Firefox extension。
- Firefox source archive：用于 Firefox 扩展审核的源码包。
- SHA-256 checksums：下载后可用 checksums.txt 校验 zip 文件完整性。

### 兼容性与权限

- Chrome / Edge 使用 MV3 构建。
- Firefox 使用 MV2 构建。
- 扩展权限只包含 bookmarks。
- 不声明 content_scripts，不向网页注入脚本。

### 变更内容

{{#if commitGroups}}
{{#each commitGroups}}
#### {{title}}

{{#each commits}}
- {{header}}{{#if hash}} ([{{hash}}]({{@root.host}}/{{@root.owner}}/{{@root.repository}}/commit/{{hash}})){{/if}}
{{/each}}

{{/each}}
{{else}}
- 本次发布没有可展示的提交变更。
{{/if}}

{{#if noteGroups}}
### 破坏性变更

{{#each noteGroups}}
#### {{title}}

{{#each notes}}
- {{text}}
{{/each}}

{{/each}}
{{/if}}
`,
};
