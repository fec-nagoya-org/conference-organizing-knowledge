---
name: repo-setup-practices
description: >-
  リポジトリの初期セットアップや開発環境整備を行う際のベストプラクティスを提供するスキル。
  新規リポジトリ作成、開発環境構築、CI/CD設定、リンター導入、Gitフック設定、テスト環境構築などの相談や作業依頼に対応する。
  「リポジトリ作成」「プロジェクト初期化」「開発環境」「セットアップ」「CI」「リンター」「フォーマッター」「Gitフック」「テスト環境」といったキーワードを含む質問や作業依頼があった場合に使用すること。
---

# リポジトリセットアップのベストプラクティス

このスキルは、リポジトリの初期セットアップにおいて守るべき実践パターンをまとめたものである。
新しいプロジェクトを立ち上げる際や、既存プロジェクトの開発環境を整備する際にこのガイドに従うこと。

## 1. mise によるツールバージョン管理

ランタイムやCLIツールのバージョン管理には [mise](https://mise.jdx.dev/) を使用する。

### やること

- プロジェクトルートに `mise.toml` を作成し、使用するツールとバージョンを定義する
- バージョンは `latest` ではなく具体的なバージョン番号で固定する
- CI（GitHub Actions）でも `jdx/mise-action` を使い、ローカルと同一のバージョンで実行する

### mise.toml の例

```toml
[tools]
node = "22.16.0"
pnpm = "10.12.1"
```

### 判断基準

- `latest` は初期の試行段階では許容するが、CIを組む段階までには必ず固定する
- バージョン固定の単位はパッチバージョンまで（例: `22.16.0`、`22` や `22.16` ではない）

## 2. pnpm をパッケージマネージャーとして採用

パッケージマネージャーには pnpm を使用する。

### やること

- mise.toml で pnpm のバージョンを管理する
- スクリプト実行は `pnpm run` または pnpm のショートハンドで統一する
- CI では `pnpm install --frozen-lockfile` で再現性を確保する
- `package.json` に `"private": true` を設定して誤公開を防ぐ

### package.json のスクリプト設計

- コマンド名は短く直感的にする: `check`, `test`, `validate`, `build` など
- lint と format は `check` に統合する（biome の `--write` オプションで自動修正込み）
- 用途ごとの例:

```json
{
  "scripts": {
    "check": "biome check --write .",
    "test": "vitest run",
    "build": "tsc"
  }
}
```

## 3. biome でリント・フォーマットを一本化

リンターとフォーマッターには [Biome](https://biomejs.dev/) を採用し、ESLint + Prettier の代わりに単一ツールで完結させる。

### やること

- `biome.json` をプロジェクトルートに作成する
- `biome init` で生成した設定をベースにし、プロジェクトに合わせて `files.includes` を調整する
- linter は `recommended` プリセットを使用する
- VCS連携（`vcs.enabled: true`, `useIgnoreFile: true`）を有効にし、`.gitignore` のファイルを自動除外する
- Biome のメジャーバージョンアップには早めに追従する

### biome.json の例

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.1/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "includes": ["src/**", "scripts/**"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended"
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

## 4. lefthook による Git フック

Git フックの管理には [Lefthook](https://github.com/evilmartians/lefthook) を使用する。

### やること

- `lefthook.yml` をプロジェクトルートに作成する
- pre-commit フックは `parallel: true` にして並列実行し、待ち時間を短くする
- pre-push にもバリデーションを入れ、壊れた状態がリモートに到達しないようにする

### lefthook.yml で入れるべきチェック

| フック | チェック内容 | 目的 |
|---|---|---|
| pre-commit | biome check（lint/format） | コード品質の維持 |
| pre-commit | 重要ファイルの存在確認（`test -f`） | 誤削除の検知 |
| pre-commit | JSON 構文チェック | 設定ファイル破損の防止 |
| pre-push | プロジェクト固有のバリデーション | リモートへの不正な状態の伝播防止 |

### lefthook.yml の例

```yaml
pre-commit:
  parallel: true
  commands:
    biome-check:
      glob: "*.{js,mjs,ts,tsx,json}"
      run: pnpm run check
    config-json-valid:
      run: python3 -c "import json; json.load(open('config.json'))"

pre-push:
  commands:
    test:
      run: pnpm run test
```

## 5. GitHub Actions の構成

### やること

- **CI ワークフロー**（`ci.yml`）を作成し、push および PR で自動テストを実行する
- ステップは最小限にする: checkout → mise-action → pnpm install → test
- Actions のバージョンは最新のメジャーバージョンを使い、定期的に更新する
- `permissions` は必要最小限を明示的に設定する
- 定期実行ワークフローには `workflow_dispatch` も併設し、手動トリガーも可能にする

### ci.yml の例

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: jdx/mise-action@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test
```

### 判断基準

- CI のステップが5つを超えたら、ジョブの分割やcomposite actionの導入を検討する
- secrets は必要なワークフローにだけ渡す

## 6. テスタビリティの設計

### やること

- ロジックはエントリポイント（CLIスクリプト等）から分離し、純粋な関数としてモジュールに切り出す
- テストフレームワークには vitest を採用する
- テストの追加と CI ワークフローの作成は同時に行う（テストだけあって CI で回っていない状態を作らない）

### ディレクトリ構成の例

```
scripts/
  ├── fetch-data.mjs          # エントリポイント（IO・副作用を担当）
  ├── transform.mjs           # 純粋なロジック（テスト対象）
  └── __tests__/
      └── transform.test.mjs  # テスト
```

### 判断基準

- 「この関数は単体テストを書けるか？」を設計時に意識する
- 外部IO（ファイル読み書き、API呼び出し）と変換ロジックを同じ関数に混ぜない

## セットアップ時のチェックリスト

新しいリポジトリをセットアップする際は、以下の順序で進めること。

1. [ ] `mise.toml` を作成し、node と pnpm のバージョンを固定する
2. [ ] `pnpm init` で `package.json` を生成し、`"private": true` を追加する
3. [ ] `pnpm add -D @biomejs/biome` で biome を導入し、`biome.json` を生成する
4. [ ] `package.json` の scripts に `check`（biome）と `test`（vitest）を追加する
5. [ ] `lefthook.yml` を作成し、pre-commit / pre-push フックを定義する
6. [ ] `.github/workflows/ci.yml` を作成し、push/PR 時のテスト実行を設定する
7. [ ] ロジックをテスト可能な関数に分離し、vitest でテストを書く

## 回答の方針

- ユーザーがリポジトリのセットアップや開発環境構築について相談した場合、このガイドに従って提案・実行する
- 既存プロジェクトに対しては、現状との差分を確認した上で、段階的に導入を提案する
- ツールの選定理由を聞かれた場合は、シンプルさ・統一性・再現性の観点から説明する
- 具体的な設定ファイルの内容は、プロジェクトの技術スタックに合わせて調整する
