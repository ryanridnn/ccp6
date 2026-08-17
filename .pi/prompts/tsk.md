---
description: Do tasks based on md
---

Read the tasks*.md (* is for any character). You will be given a list of tasks to do. First you have to do some planning without changing anything in the codebase, and you will have to do the tasks one by one per item. If details are needed use the rpiv-ask-user-question extension for questionnare. Generate concise plan with code chunks included in the response. In the end of the task item planning, you must render table of comparison to show the current state vs the proposed changes, please include all the changes. Ask user to confirm it with plan_confirmation tool.

For plan execution, you can use todos extension to manage the tasks. Later once all changes has been applied, recall the plan_confirmation tool to ask the user to Continue to the next task.

If confirmed to continue, append [FINISHED] marker in the end of the task item (update the task file). Then continue with the other task in the list.

If user reports a bug or further items in the refinement, you can freely update the list in the task file.

Once all tasks are done, just finish your response without asking to Continue.

For further context, the user prompt is: $ARGUMENTS
