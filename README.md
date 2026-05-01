This project is a full-stack web application where users can create projects, add team members, assign tasks, and track project progress. It supports role-based access control, so Admins can manage projects and users, while Members can work on assigned tasks.

Core Idea

The app helps teams manage work in one place:

Users can sign up/login, create or join projects, assign tasks to members, update task status, and monitor progress through a dashboard.

Main Features
Authentication

Users can:

Signup
Login
Logout
Access protected pages using JWT/session auth
Role-Based Access

Two roles:

Admin

Create projects
Add/remove members
Create and assign tasks
Update/delete projects and tasks
View full project dashboard

Member

View assigned projects
View assigned tasks
Update task status
Comment/update progress
Project Management

Each project has:

Project name
Description
Start date
Deadline
Status
Team members
Task Management

Each task has:

Title
Description
Assigned member
Priority
Status: Todo, In Progress, Completed
Due date
Project reference
Dashboard

Dashboard shows:

Total projects
Total tasks
Completed tasks
Pending tasks
Overdue tasks
Progress percentage
Recent tasks
