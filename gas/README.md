# Google Apps Script Backend

Copy `main.gs` and `sheets.gs` into an Apps Script project bound to your budget spreadsheet.

## Deployment

1. Open Apps Script for your spreadsheet.
2. Create script files and paste contents.
3. Deploy as Web App.
4. Access: `Anyone` (required for GitHub Pages frontend).
5. Copy the Web App URL and set `API_BASE` in `app.js`.

## Routing

Use query-based path routing from frontend:
- `GET ?path=summary`
- `GET ?path=items`
- `POST ?path=setNetIncome`
- `POST ?path=addItem`
- `POST ?path=updateItem`
- `POST ?path=deleteItem`

All POST bodies must be plain-text URL encoded key/value pairs.
