#!/bin/bash
# JSON Viewer 自动发布脚本 (Bash)
# 用�? 自动上传代码、触发构建、创�?Release

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 输出函数
success() { echo -e "${GREEN}�?$1${NC}"; }
error() { echo -e "${RED}�?$1${NC}"; exit 1; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# 参数解析
VERSION=""
MESSAGE="Release new version"
SKIP_BUILD=false
DRY_RUN=false
VERSION_BUMP=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -m|--message)
            MESSAGE="$2"
            shift 2
            ;;
        --major)
            VERSION_BUMP="major"
            shift
            ;;
        --minor)
            VERSION_BUMP="minor"
            shift
            ;;
        --patch)
            VERSION_BUMP="patch"
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  -v, --version VERSION    指定版本�?(�?1.0.0)"
            echo "  --major                  主版本号 +1"
            echo "  --minor                  次版本号 +1"
            echo "  --patch                  补丁版本�?+1"
            echo "  -m, --message MESSAGE    提交信息"
            echo "  --skip-build             跳过本地构建测试"
            echo "  --dry-run                模拟运行，不实际执行"
            echo "  -h, --help               显示帮助"
            echo ""
            echo "示例:"
            echo "  $0 --version 1.0.0"
            echo "  $0 --patch"
            echo "  $0 --minor --message 'Add new features'"
            exit 0
            ;;
        *)
            error "未知参数: $1"
            ;;
    esac
done

# 检查是否在 Git 仓库�?if [ ! -d .git ]; then
    error "当前目录不是 Git 仓库"
fi

info "JSON Viewer 自动发布脚本"
echo ""

# 1. 检查工作区状�?info "检查工作区状�?.."
if [ -n "$(git status --porcelain)" ]; then
    warning "工作区有未提交的更改:"
    git status --short
    if [ "$DRY_RUN" = false ]; then
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "已取�?
            exit 0
        fi
    fi
fi

# 2. 获取当前版本
info "读取当前版本..."
CURRENT_VERSION=$(node -p "require('./package.json').version")
info "当前版本: $CURRENT_VERSION"

# 3. 计算新版�?if [ -z "$VERSION" ]; then
    if [ -n "$VERSION_BUMP" ]; then
        IFS='.' read -r -a version_parts <<< "$CURRENT_VERSION"
        major="${version_parts[0]}"
        minor="${version_parts[1]}"
        patch="${version_parts[2]}"
        
        case $VERSION_BUMP in
            major)
                major=$((major + 1))
                minor=0
                patch=0
                ;;
            minor)
                minor=$((minor + 1))
                patch=0
                ;;
            patch)
                patch=$((patch + 1))
                ;;
        esac
        
        VERSION="$major.$minor.$patch"
    else
        error "请指定版本号或使�?--major/--minor/--patch 参数"
    fi
fi

success "新版�? $VERSION"

# 4. 更新版本�?if [ "$DRY_RUN" = false ]; then
    info "更新 package.json..."
    npm version $VERSION --no-git-tag-version
    
    info "更新 src-tauri/tauri.conf.json..."
    if command -v jq &> /dev/null; then
        jq ".version = \"$VERSION\"" src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp
        mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json
    else
        sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json
        rm -f src-tauri/tauri.conf.json.bak
    fi
    
    info "更新 src-tauri/Cargo.toml..."
    sed -i.bak "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml
    rm -f src-tauri/Cargo.toml.bak
    
    success "版本号已更新"
else
    warning "[DRY RUN] 跳过版本号更�?
fi

# 5. 本地构建测试（可选）
if [ "$SKIP_BUILD" = false ]; then
    info "运行本地构建测试..."
    
    info "构建前端..."
    npm run build:web || error "前端构建失败"
    success "前端构建成功"
    
    info "检�?Rust 代码..."
    cargo check --manifest-path src-tauri/Cargo.toml || error "Rust 检查失�?
    success "Rust 检查通过"
else
    warning "跳过本地构建测试"
fi

# 6. Git 提交
if [ "$DRY_RUN" = false ]; then
    info "提交更改�?Git..."
    git add package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
    git commit -m "chore: bump version to $VERSION"
    success "已提交版本更�?
else
    warning "[DRY RUN] 跳过 Git 提交"
fi

# 7. 创建 Git 标签
if [ "$DRY_RUN" = false ]; then
    info "创建 Git 标签 v$VERSION..."
    git tag -a "v$VERSION" -m "$MESSAGE"
    success "已创建标�?v$VERSION"
else
    warning "[DRY RUN] 跳过创建标签"
fi

# 8. 推送到 GitHub
if [ "$DRY_RUN" = false ]; then
    info "推送到 GitHub..."
    
    info "推送代�?.."
    git push origin main || error "推送代码失�?
    
    info "推送标�?.."
    git push origin "v$VERSION" || error "推送标签失�?
    
    success "已推送到 GitHub"
else
    warning "[DRY RUN] 跳过推送到 GitHub"
fi

# 9. 完成
echo ""
success "发布流程完成�?
info "版本: v$VERSION"
info "GitHub Actions 将自动构建并创建 Release"
info "预计 30-50 分钟后完�?
echo ""
info "查看构建进度:"
echo -e "  ${YELLOW}https://github.com/你的用户�?jsonview/actions${NC}"
echo ""
info "构建完成后，访问 Releases 页面编辑并发�?"
echo -e "  ${YELLOW}https://github.com/你的用户�?jsonview/releases${NC}"
echo ""
