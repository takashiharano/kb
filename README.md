# Knowledge Base System

A lightweight, browser-based knowledge base for organizing, searching, and editing notes and reference data. It stores entries in files rather than a database and supports multiple repositories, metadata, embedded files, and configurable access permissions.

Knowledge Base System (KB) integrates with Web Authentication and Authorization (WebSys) for user authentication and permission management. It is designed for self-hosted environments where a simple, portable file-based system is preferred.

## Features

- Create, edit, duplicate, and delete entries through a browser-based interface
- Search titles, labels, body text, dates, authors, and other metadata
- Organize entries with labels, categories, statuses, and multiple repositories
- View content as plain text, Markdown-like text, or HTML
- Embed images and other files as Base64 data URLs using drag and drop
- Set entry-level privileges and optional password prompts
- Control read access and write, delete, and export operations through WebSys
- Optionally encode stored entries with a configurable XB64 key
- Detect conflicting edits and record activity in an application log
- Export repository data as ZIP archives or individual entries as HTML
- Associate executable browser-side JavaScript logic with entries
- Store data in text files without a database server

## Requirements and dependencies

- Python 3
- A web server configured to execute Python CGI scripts
- Web Authentication and Authorization (WebSys), installed separately
- A writable data directory outside the web document root
- The following **separately supplied shared libraries**, installed in a sibling `libs/` directory:
  - `util.js` — https://libutil.com/
  - `util.py` — https://libutil.com/
  - `bsb64.py` — https://github.com/takashiharano/bsb64
  - `xb64.py` — https://github.com/takashiharano/xb64
  - `debug.js` — https://debugjs.net/
  - `sha.js` — https://github.com/Caligatio/jsSHA

**The KB archive contains only the `kb/` application files.** WebSys, its `auth/` interface, the shared `libs/` directory, and the private data directories must be installed or created separately. No database server or build process is required.

## Deployment

### Directory layout

```text
server/
|
+- private/
|  |
|  +- kb/                         (writable by the CGI process)
|     |
|     +- repos/
|     |  |
|     |  +- 0/                    (default repository)
|     |     |
|     |     +- data/              (entry *.txt files)
|     |     +- properties.txt     (optional)
|     |     +- categories.json    (optional)
|     |
|     +- tmp/                     (temporary files and locks)
|     +- categories.json          (optional shared categories)
|     +- info.txt                 (optional welcome text)
|     +- kb.log                   (generated application log)
|
+- public/                       (web document root)
   |
   +- auth/                       (provided by WebSys)
   |
   +- kb/
   |  |
   |  +- api.cgi [755]
   |  +- apiimpl.py [644]
   |  +- appconfig.py [644]
   |  +- index.cgi [755]
   |  +- js.py [644]
   |  +- kb.js [644]
   |  +- kb.py [644]
   |  +- kblog.py [644]
   |  +- screen.py [644]
   |  +- style.css [644]
   |  +- style.py [644]
   |
   +- libs/                       (separately installed libraries)
   |  |
   |  +- bsb64.py
   |  +- debug.js
   |  +- sha.js
   |  +- util.js
   |  +- util.py
   |  +- xb64.py
   |
   +- websys/                     (provided by WebSys)
```

Numbers in brackets indicate example file permissions (octal notation). Actual permissions depend on the server configuration. The `private/` directory must not be accessible through the web server.

### Setup

1. Install and configure WebSys, including its `auth/` interface and private storage.
2. Copy the contents of the supplied `kb/` directory to `public/kb/`.
3. Install the required shared libraries in `public/libs/`.
4. Set the first-line shebang in `index.cgi` and `api.cgi` to the Python 3 executable used by your web server, and enable CGI execution for those files.
5. Create `private/kb/repos/0/data/` for the default repository. Ensure the CGI process can read and write under `private/kb/`, including repository files, logs, and temporary lock files.
6. Review `public/kb/appconfig.py`, especially `root_path`, `workspace_path`, `access_control`, and `data_encryption_key`. The default relative paths assume the layout above.
7. In WebSys, grant the appropriate KB permissions to users who need to create, modify, delete, or export entries.

Configure `data_encryption_key` before creating encoded entries. Changing it afterward without converting existing data prevents those entries from being decoded with the new key.

## Configuration

Settings are defined in `public/kb/appconfig.py`.

| Setting | Purpose |
| --- | --- |
| `root_path` | Relative path from `kb/` to the shared public directories |
| `libs_dir` | Shared libraries directory relative to the public root |
| `libs_path` | Path to the shared Python libraries directory |
| `libs_url_path` | URL path to the shared JavaScript libraries |
| `workspace_path` | Location of the private KB data directory |
| `home_path` | Destination of the HOME link |
| `access_control` | Authentication and operation-permission mode; defaults to `auth` |
| `title`, `system_name` | Browser title and displayed application name |
| `list_max`, `list_height` | Default list limit and list-pane height |
| `state_list` | Available entry statuses and display colors |
| `default_data_encryption` | Default encoding option for newly created entries |
| `data_encryption_key` | Key used to encode and decode stored XB64 entries |
| `default_encryption_key` | Default key supplied to browser-side encoding tools |
| `user_name_lang` | Preferred display name language from WebSys |
| `api_tokens` | Optional tokens accepted for selected API operations |

Repository settings are stored in `private/kb/repos/<repo-id>/properties.txt` as JSON. For example:

```json
{
  "name": "Main",
  "privs": "",
  "encrypt": true
}
```

The `privs` property controls repository access using WebSys privileges; an empty value imposes no additional repository-level privilege requirement on authenticated users. The `encrypt` property selects the default encoding setting for new entries in that repository. Repositories can also have their own `categories.json`; otherwise the shared file under `private/kb/` is used.

## Usage

Open `http(s)://SERVER/kb/` and sign in through WebSys when prompted. Repository `0` is the default repository.

Select **NEW** to create an entry. Enter a title, labels, optional status, and content, then select **SAVE**. Entries receive numeric IDs automatically; existing entries can be opened by ID, edited, duplicated, or deleted according to the user's permissions.

Use the keyword field to search entry content and metadata. For example:

| Query | Matches |
| --- | --- |
| `network` | Entries containing the keyword `network` in their title, labels, or body |
| `title:network` | Entries whose titles contain `network` |
| `label:reference` | Entries with the `reference` label |
| `status:TODO` | Entries marked `TODO` |
| `id:1-20` | Entries with IDs in the specified range |
| `created_by:alice` | Entries matching the specified creator |

The content viewer offers **Plain**, **MD-Like**, and **HTML** modes. Markdown-like mode recognizes links, code spans, references such as `KB#123`, and embedded Base64 data. Dragging a file into the editor inserts a data URL, allowing supported content to be previewed or downloaded from an entry.

Use **REPO** to switch repositories. Users with administrative privileges can manage repository properties and create or delete repositories. The **EXPORT** action downloads data as a ZIP archive; **SAVE AS** exports the displayed entry to an HTML file. The **LOGIC** feature allows stored JavaScript to be executed in the browser on request.

Entries can be linked directly:

```text
http(s)://SERVER/kb/?id=123
http(s)://SERVER/kb/?repo=notes&id=123
```

### Permissions and storage

KB uses WebSys privileges for operation-level access, including `kb.write`, `kb.delete`, `kb.export`, and `kb.admin`. Repository-specific privileges can use the `<repo-id>.kb.write` pattern. The `sysadmin` privilege also grants KB operation permissions. Repository and entry `PRIVS` fields can impose additional access requirements.

An entry's optional password prompt is enforced in the browser; use WebSys privileges to restrict access to the underlying data through the server API.

Entries are stored as `.txt` files under `private/kb/repos/<repo-id>/data/`. Each file contains metadata fields followed by a blank line and the entry body. Entries using XB64 encoding are stored in encoded form. Backups and server migrations can be performed by copying the KB application files and the private KB data directory while preserving the configuration and directory structure.

## License

Knowledge Base System is released under the MIT License.
