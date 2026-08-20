/**
 * Trigger GitHub Actions workflow dispatch asynchronously when admin updates data.
 */
export const triggerGitHubDeploy = async () => {
     try {
          const owner = process.env.GITHUB_OWNER;
          const repo = process.env.GITHUB_REPO;
          const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;

          if (!owner || !repo || !token) {
               console.log("[GitHub Deploy] Trigger skipped: GITHUB_OWNER, GITHUB_REPO, or GITHUB_PAT not set in environment variables.");
               return;
          }

          console.log(`[GitHub Deploy] 🚀 Admin change detected! Dispatching GitHub Actions build for ${owner}/${repo}...`);

          const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/deploy.yml/dispatches`, {
               method: "POST",
               headers: {
                    "Accept": "application/vnd.github+json",
                    "Authorization": `Bearer ${token}`,
                    "X-GitHub-Api-Version": "2022-11-28",
                    "Content-Type": "application/json",
                    "User-Agent": "Node-Backend-Deploy-Trigger"
               },
               body: JSON.stringify({
                    ref: "main"
               })
          });

          if (response.ok || response.status === 204) {
               console.log("[GitHub Deploy] ✅ GitHub Actions build triggered successfully!");
          } else {
               const errorBody = await response.text();
               console.error(`[GitHub Deploy] ❌ Failed to trigger build (${response.status}):`, errorBody);
          }
     } catch (error) {
          console.error("[GitHub Deploy] ❌ Error calling GitHub API:", error.message);
     }
};
