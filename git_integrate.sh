#!/bin/bash
# git_integrate.sh
# Automates the Git integration workflow:
# 1. Checks Git status and stashes or commits local changes.
# 2. Creates and checks out a new branch.
# 3. Fetches a target remote branch.
# 4. Merges it and halts interactively for merge conflict resolution.
# 5. Performs a build check (npm run build) to ensure no build/TS errors.
# 6. Prepares for local testing.

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

write_header() {
    echo -e "\n${CYAN}==================================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}==================================================${NC}"
}

write_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

write_info() {
    echo -e "[INFO] $1"
}

write_warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

write_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# 1. Check if git is installed
if ! command -v git &> /dev/null; then
    write_error "Git is not installed or not in PATH. Please install Git and try again."
    exit 1
fi

# 2. Check if git repository
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    write_warn "Current directory is not a Git repository."
    read -p "Would you like to initialize a Git repository here? (y/n): " init_choice
    if [[ "$init_choice" =~ ^[Yy]$ ]]; then
        git init
        write_success "Initialized empty Git repository."
        read -p "Enter remote repository URL (leave blank to skip, e.g., https://github.com/AdwikaVishal/Dell-Futureminds.git): " remote_url
        if [ ! -z "$remote_url" ]; then
            git remote add origin "$remote_url"
            write_success "Added remote 'origin' pointing to $remote_url"
        fi
    else
        write_error "Exiting script as Git repository is required."
        exit 1
    fi
fi

# 3. Ensure all local changes are committed or stashed
write_header "Step 1: Check Local Changes"
has_commits=true
if ! git log -1 &> /dev/null; then
    has_commits=false
    write_warn "No commits exist in this repository yet."
fi

status=$(git status --porcelain)
if [ ! -z "$status" ]; then
    write_warn "You have uncommitted local changes:"
    git status -s
    
    if [ "$has_commits" = false ]; then
        write_info "Since there are no commits yet, we must commit these changes to start."
        read -p "Enter initial commit message (default: 'Initial commit'): " commit_msg
        if [ -z "$commit_msg" ]; then commit_msg="Initial commit"; fi
        git add -A
        git commit -m "$commit_msg"
        write_success "Created initial commit: '$commit_msg'"
        has_commits=true
    else
        echo -e "\nChoose an option to proceed:"
        echo "1) Commit changes"
        echo "2) Stash changes"
        echo "3) Ignore / proceed anyway (not recommended)"
        echo "4) Abort script"
        read -p "Enter option (1-4): " opt
        
        case $opt in
            1)
                read -p "Enter commit message: " commit_msg
                if [ -z "$commit_msg" ]; then commit_msg="WIP changes"; fi
                git add -A
                git commit -m "$commit_msg"
                write_success "Committed changes: '$commit_msg'"
                ;;
            2)
                read -p "Enter stash message (optional): " stash_msg
                if [ -z "$stash_msg" ]; then
                    git stash push
                else
                    git stash push -m "$stash_msg"
                fi
                write_success "Changes stashed successfully."
                ;;
            3)
                write_warn "Proceeding with uncommitted changes. This might cause merge issues."
                ;;
            *)
                write_info "Aborting script."
                exit 0
                ;;
        esac
    fi
else
    write_success "Working tree is clean."
fi

# 4. Check out new branch
write_header "Step 2: Create New Branch"
if [ "$has_commits" = false ]; then
    write_warn "Cannot create a branch because there are no commits in the repository."
    write_info "Creating a placeholder commit..."
    echo "# TaskPilot Integration" > README.md
    git add README.md
    git commit -m "Initial placeholder commit"
    has_commits=true
fi

current_branch=$(git branch --show-current)
write_info "Current branch is: $current_branch"
read -p "Enter name for the new branch: " new_branch
if [ -z "$new_branch" ]; then
    new_branch="feature/integration-$(date +%Y%m%d-%H%M%S)"
    write_info "No name entered. Using default name: $new_branch"
fi

git checkout -b "$new_branch"
if [ $? -ne 0 ]; then
    write_error "Failed to create/checkout branch $new_branch."
    exit 1
fi
write_success "Switched to new branch: $new_branch"

# 5. Fetch specific branch from remote
write_header "Step 3: Fetch Target Branch"
read -p "Enter remote name (default: origin): " remote_name
if [ -z "$remote_name" ]; then remote_name="origin"; fi

# Double check if remote exists
if ! git remote | grep -q "^$remote_name$"; then
    write_warn "Remote '$remote_name' does not exist."
    read -p "Enter remote repository URL to add (e.g., https://github.com/AdwikaVishal/Dell-Futureminds.git): " remote_url
    if [ ! -z "$remote_url" ]; then
        git remote add "$remote_name" "$remote_url"
        write_success "Added remote '$remote_name'"
    else
        write_error "Remote URL required to fetch. Aborting."
        exit 1
    fi
fi

read -p "Enter remote branch to merge (default: aditi-final): " target_branch
if [ -z "$target_branch" ]; then target_branch="aditi-final"; fi

write_info "Fetching '$target_branch' from remote '$remote_name'..."
git fetch "$remote_name" "$target_branch"
if [ $? -ne 0 ]; then
    write_error "Failed to fetch remote branch '$target_branch' from '$remote_name'."
    write_info "Please verify remote branch exists and you have network access."
    exit 1
fi
write_success "Fetched remote branch successfully."

# 6. Merge remote branch
write_header "Step 4: Merge Remote Branch"
write_info "Merging '$remote_name/$target_branch' into '$new_branch'..."
git merge "$remote_name/$target_branch" --no-edit

if [ $? -ne 0 ]; then
    conflicts=$(git diff --name-only --diff-filter=U)
    if [ ! -z "$conflicts" ]; then
        write_warn "!!! MERGE CONFLICTS DETECTED !!!"
        echo -e "${YELLOW}The following files have conflicts that need manual resolution:${NC}"
        for file in $conflicts; do
            echo -e " - ${RED}$file${NC}"
        done
        
        echo -e "\n${CYAN}Instructions:${NC}"
        echo -e "1. Open the conflicted files in your IDE (e.g. VS Code)."
        echo -e "2. Resolve all conflict markers (<<<<<<<, =======, >>>>>>>)."
        echo -e "3. Save the files."
        
        resolved=false
        while [ "$resolved" = false ]; do
            echo -e "\nWhat would you like to do?"
            echo "1) I have resolved all conflicts and want to continue"
            echo "2) Abort the merge"
            echo "3) Show conflicted files again"
            read -p "Enter choice (1-3): " choice
            
            case $choice in
                1)
                    remaining_conflicts=$(git diff --name-only --diff-filter=U)
                    if [ ! -z "$remaining_conflicts" ]; then
                        write_warn "Unresolved conflicts still exist in these files:"
                        for file in $remaining_conflicts; do
                            echo -e " - ${RED}$file${NC}"
                        done
                    else
                        write_info "Staging resolved files..."
                        git add -A
                        git commit --no-edit
                        if [ $? -eq 0 ]; then
                            write_success "Merge conflicts resolved and changes committed."
                            resolved=true
                        else
                            write_error "Failed to commit the resolved merge. Please check git status."
                        fi
                    fi
                    ;;
                2)
                    write_info "Aborting merge..."
                    git merge --abort
                    write_warn "Merge aborted."
                    exit 0
                    ;;
                3)
                    remaining_conflicts=$(git diff --name-only --diff-filter=U)
                    if [ ! -z "$remaining_conflicts" ]; then
                        echo -e "${YELLOW}Conflicted files:${NC}"
                        for file in $remaining_conflicts; do
                            echo -e " - ${RED}$file${NC}"
                        done
                    else
                        write_success "No remaining conflicts detected! You can select option 1 to finish."
                    fi
                    ;;
                *)
                    write_info "Invalid choice."
                    ;;
            esac
        done
    else
        write_error "Merge failed, but no conflict markers were found. Please check git status."
        exit 1
    fi
else
    write_success "Merge completed successfully without conflicts!"
fi

# 7. Verification
write_header "Step 5: Verify Build Safety"
write_info "Validating project build to ensure TypeScript safety..."
if [ -f "package.json" ]; then
    write_info "Running: npm run build"
    npm run build
    if [ $? -eq 0 ]; then
        write_success "Build compilation completed successfully! TypeScript/Vite is fully clean."
    else
        write_warn "Build compile failed. There may be TypeScript errors or missing dependencies after the merge."
        write_warn "Please inspect the error output above and resolve any code issues."
    fi
else
    write_info "No package.json found, skipping build verification step."
fi

# 8. Complete
write_header "Integration Complete!"
write_success "Branch '$new_branch' is now fully integrated with '$remote_name/$target_branch'."
echo -e "\nTo start testing the integrated frontend locally, run:"
echo -e "  ${CYAN}npm run dev${NC}"
echo -e "\nOr, if the development server is already running, refresh your browser at:"
echo -e "  ${CYAN}http://localhost:5173${NC}\n"
