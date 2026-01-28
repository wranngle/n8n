# Email Templates

Branded HTML email templates for Wranngle voice AI workflows.

## Templates

| Template | Purpose | Key Variables |
|----------|---------|---------------|
| `base.html` | Master layout with header/footer | `subject`, `content`, `year` |
| `welcome.html` | First contact with new leads | `first_name`, `demo_link` |
| `call-followup.html` | Post-call summary | `first_name`, `call_summary`, `next_steps` |
| `meeting-confirmation.html` | Demo booking confirmation | `meeting_date`, `meeting_time`, `meeting_link` |

## Usage in n8n

### Option 1: HTTP Request Node
```javascript
// Fetch template from GitHub raw URL or local server
const template = await $http.get('https://raw.githubusercontent.com/.../base.html');
```

### Option 2: Code Node
```javascript
const baseTemplate = `... template content ...`;
const content = baseTemplate
  .replace('{{first_name}}', $json.first_name)
  .replace('{{subject}}', 'Welcome to Wranngle');
return [{ json: { html: content } }];
```

### Option 3: Set Node with Expression
```
={{ $json.template.replace('{{first_name}}', $json.customer.first_name) }}
```

## Brand Guidelines

### Colors
- Primary: `#2563eb` (Blue)
- Primary Dark: `#1d4ed8`
- Secondary: `#64748b` (Slate)
- Background: `#f8fafc`
- Text: `#1e293b`

### Typography
- Font: System fonts (Apple, Segoe UI, Roboto)
- Body: 16px, line-height 1.6
- Headers: 24px (h1), 20px (h2)

### Logo
Replace placeholder in `base.html` with actual logo URL:
```html
<img src="https://wranngle.com/logo.png" alt="Wranngle">
```

## Testing

Send test emails through n8n using SMTP2GO credentials:
- Host: `mail.smtp2go.com`
- Port: `2525`
- From: `sarah@wranngle.com`
