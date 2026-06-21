# git_integrate.ps1
# Automates the Git integration workflow:
# 1. Checks Git status and stashes or commits local changes.
# 2. Creates and checks out a new branch.
# 3. Fetches a target remote branch.
# 4. Merges it and halts interactively for merge conflict resolution.
# 5. Performs a build check (npm run build) to ensure no build/TS errors.
# 6. Prepares for local testing.

# Set output encoding to UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Header ($msg) {
    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host " $msg" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
}

function Write-Success ($msg) {
    Write-Host "[SUCCESS] $msg" -ForegroundColor Green
}

function Write-Info ($msg) {
    Write-Host "[INFO] $msg" -ForegroundColor White
}

function Write-Warn ($msg) {
    Write-Host "[WARNING] $msg" -ForegroundColor Yellow
}

function Write-ErrorMsg ($msg) {
    Write-Host "[ERROR] $msg" -ForegroundColor Red
}

# 1. Check if Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-ErrorMsg "Git is not installed or not in the PATH. Please install Git and try again."
    Exit 1
}

# 2. Check if it's a Git repository
$gitStatus = git status 2>&1
if ($gitStatus -match "not a git repository") {
    Write-Warn "Current directory is not a Git repository."
    $choice = Read-Host "Would you like to initialize a Git repository here? (y/n)"
    if ($choice -eq 'y' -or $choice -eq 'yes') {
        git init
        Write-Success "Initialized empty Git repository."
        # Ask to add remote
        $remoteUrl = Read-Host "Enter remote repository URL (leave blank to skip, e.g., https://github.com/AdwikaVishal/Dell-Futureminds.git)"
        if ($remoteUrl) {
            git remote add origin $remoteUrl
            Write-Success "Added remote 'origin' pointing to $remoteUrl"
        }
    } else {
        Write-ErrorMsg "Exiting script as Git repository is required."
        Exit 1
    }
}

# 3. Ensure all local changes are committed or stashed
Write-Header "Step 1: Check Local Changes"
# Check if git has commits (to know if we can stash or checkout)
$hasCommits = $true
git log -1 >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    $hasCommits = $false
    Write-Warn "No commits exist in this repository yet."
}

$status = git status --porcelain
if ($status) {
    Write-Warn "You have uncommitted local changes:"
    git status -s
    
    if (-not $hasCommits) {
        Write-Info "Since there are no commits yet, we must commit these changes to start."
        $msg = Read-Host "Enter initial commit message (default: 'Initial commit')"
        if (-not $msg) { $msg = "Initial commit" }
        git add -A
        git commit -m $msg
        Write-Success "Created initial commit: '$msg'"
        $hasCommits = $true
    } else {
        Write-Host "`nChoose an option to proceed:"
        Write-Host "1) Commit changes"
        Write-Host "2) Stash changes"
        Write-Host "3) Ignore / proceed anyway (not recommended)"
        Write-Host "4) Abort script"
        $opt = Read-Host "Enter option (1-4)"
        
        switch ($opt) {
            "1" {
                $msg = Read-Host "Enter commit message"
                if (-not $msg) { $msg = "WIP changes" }
                git add -A
                git commit -m $msg
                Write-Success "Committed changes: '$msg'"
            }
            "2" {
                $msg = Read-Host "Enter stash message (optional)"
                if ($msg) {
                    git stash push -m "$msg"
                } else {
                    git stash push
                }
                Write-Success "Changes stashed successfully."
            }
            "3" {
                Write-Warn "Proceeding with uncommitted changes. This might cause merge issues."
            }
            default {
                Write-Info "Aborting script."
                Exit 0
            }
        }
    }
} else {
    Write-Success "Working tree is clean."
}

# 4. Check out a new branch from current branch
Write-Header "Step 2: Create New Branch"
if (-not $hasCommits) {
    # If still no commits, we need to make one first
    Write-Warn "Cannot create a branch because there are no commits in the repository."
    Write-Info "Creating a placeholder commit..."
    New-Item -Path "README.md" -ItemType "file" -Value "# TaskPilot Integration`n" -Force > $null
    git add README.md
    git commit -m "Initial placeholder commit"
    $hasCommits = $true
}

$currentBranch = (git branch --show-current).Trim()
Write-Info "Current branch is: $currentBranch"
$newBranch = Read-Host "Enter name for the new branch"
if (-not $newBranch) {
    $newBranch = "feature/integration-" + (Get-Date -Format "yyyyMMdd-HHmmss")
    Write-Info "No name entered. Using default name: $newBranch"
}

git checkout -b $newBranch
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Failed to create/checkout branch $newBranch."
    Exit 1
}
Write-Success "Switched to new branch: $newBranch"

# 5. Fetch a specific branch from the remote
Write-Header "Step 3: Fetch Target Branch"
$remoteName = Read-Host "Enter remote name (default: origin)"
if (-not $remoteName) { $remoteName = "origin" }

# Double check if remote exists
$remoteExists = git remote
if ($remoteName -notin $remoteExists) {
    Write-Warn "Remote '$remoteName' does not exist."
    $remoteUrl = Read-Host "Enter remote repository URL to add (e.g., https://github.com/AdwikaVishal/Dell-Futureminds.git)"
    if ($remoteUrl) {
        git remote add $remoteName $remoteUrl
        Write-Success "Added remote '$remoteName'"
    } else {
        Write-ErrorMsg "Remote URL required to fetch. Aborting."
        Exit 1
    }
}

$targetBranch = Read-Host "Enter remote branch to merge (default: Aditi-final)"
if (-not $targetBranch) { $targetBranch = "Aditi-final" }

Write-Info "Fetching '$targetBranch' from remote '$remoteName'..."
git fetch $remoteName $targetBranch
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Failed to fetch remote branch '$targetBranch' from '$remoteName'."
    Write-Info "Please verify the remote branch exists and you have network access."
    Exit 1
}
Write-Success "Fetched remote branch successfully."

# 6. Merge target branch into the newly created branch
Write-Header "Step 4: Merge Remote Branch"
Write-Info "Merging '$remoteName/$targetBranch' into '$newBranch'..."
git merge "$remoteName/$targetBranch" --no-edit

$mergeStatus = $LASTEXITCODE
if ($mergeStatus -ne 0) {
    # Check if there are unresolved conflicts
    $conflicts = git diff --name-only --diff-filter=U
    if ($conflicts) {
        Write-Warn "!!! MERGE CONFLICTS DETECTED !!!"
        Write-Host "The following files have conflicts that need manual resolution:" -ForegroundColor Yellow
        foreach ($file in $conflicts) {
            Write-Host " - $file" -ForegroundColor Red
        }
        
        Write-Host "`nInstructions:" -ForegroundColor Cyan
        Write-Host "1. Open the conflicted files in your IDE (e.g. VS Code)." -ForegroundColor Cyan
        Write-Host "2. Resolve all conflict markers (<<<<<<<, =======, >>>>>>>)." -ForegroundColor Cyan
        Write-Host "3. Save the files." -ForegroundColor Cyan
        
        $resolved = $false
        while (-not $resolved) {
            Write-Host "`nWhat would you like to do?" -ForegroundColor White
            Write-Host "1) I have resolved all conflicts and want to continue"
            Write-Host "2) Abort the merge"
            Write-Host "3) Show conflicted files again"
            $choice = Read-Host "Enter choice (1-3)"
            
            switch ($choice) {
                "1" {
                    $remainingConflicts = git diff --name-only --diff-filter=U
                    if ($remainingConflicts) {
                        Write-Warn "Unresolved conflicts still exist in these files:"
                        foreach ($file in $remainingConflicts) {
                            Write-Host " - $file" -ForegroundColor Red
                        }
                    } else {
                        Write-Info "Staging resolved files..."
                        git add -A
                        git commit --no-edit
                        if ($LASTEXITCODE -eq 0) {
                            Write-Success "Merge conflicts resolved and changes committed."
                            $resolved = $true
                        } else {
                            Write-ErrorMsg "Failed to commit the resolved merge. Please check git status."
                        }
                    }
                }
                "2" {
                    Write-Info "Aborting merge..."
                    git merge --abort
                    Write-Warn "Merge aborted."
                    Exit 0
                }
                "3" {
                    $remainingConflicts = git diff --name-only --diff-filter=U
                    if ($remainingConflicts) {
                        Write-Host "Conflicted files:" -ForegroundColor Yellow
                        foreach ($file in $remainingConflicts) {
                            Write-Host " - $file" -ForegroundColor Red
                        }
                    } else {
                        Write-Success "No remaining conflicts detected! You can select option 1 to finish."
                    }
                }
                default {
                    Write-Info "Invalid choice."
                }
            }
        }
    } else {
        Write-ErrorMsg "Merge failed, but no conflict markers were found. Please check git status."
        Exit 1
    }
} else {
    Write-Success "Merge completed successfully without conflicts!"
}

# 7. Confirm successful merge and build testing
Write-Header "Step 5: Verify Build Safety"
Write-Info "Validating project build to ensure TypeScript safety..."
if (Test-Path "frontend/package.json") {
    Write-Info "Running: npm run build inside frontend subdirectory"
    Push-Location frontend
    npm run build
    $buildStatus = $LASTEXITCODE
    Pop-Location
    if ($buildStatus -eq 0) {
        Write-Success "Build compilation completed successfully! TypeScript/Vite is fully clean."
    } else {
        Write-Warn "Build compile failed. There may be TypeScript errors or missing dependencies after the merge."
        Write-Warn "Please inspect the error output above and resolve any code issues."
    }
} else {
    Write-Info "No frontend/package.json found, skipping build verification step."
}

# 8. Start local server or prepare testing instructions
Write-Header "Integration Complete!"
Write-Success "Branch '$newBranch' is now fully integrated with '$remoteName/$targetBranch'."
Write-Host "`nTo start testing the integrated frontend locally, run:" -ForegroundColor Green
Write-Host "  cd frontend" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host "`nOr, if the development server is already running, refresh your browser at:" -ForegroundColor Green
Write-Host "  http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
