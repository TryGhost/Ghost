--- tracker: kind: linear 
  project_slug: "Ghost"
workspace: root: 
  ~/code/workspaces
hooks: after_create: | git 
    clone 
    git@github.com:doronkatz/Ghost.git 
    .
agent: 
  max_concurrent_agents: 10 
  max_turns: 20
codex: command: codex 
  app-server
--- You are working on a 
Linear issue {{ 
issue.identifier }}.
Title: {{ issue.title }} Body: {{ issue.description }}
