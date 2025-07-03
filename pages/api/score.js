// pages/api/score.js
import path from 'path'
import { promises as fs } from 'fs'
import { spawn }       from 'child_process'
import formidable      from 'formidable'

export const config = {
  api: { bodyParser: false }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' })
  }

  // parse the multipart form
  const form = new formidable.IncomingForm({ keepExtensions: true })
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('form.parse error', err)
      return res.status(400).json({ error: 'cannot parse form' })
    }

    const file = files.file
    if (!file) {
      return res.status(400).json({ error: 'no file uploaded' })
    }

    // Grab the temp path
    const filePath = file.filepath || file.path
    const scriptPath = path.join(process.cwd(), 'score.py')

    // spawn python3 (not 'python')
    const py = spawn('python3', [ scriptPath, filePath ])

    let stdout = '', stderr = ''
    py.stdout.on('data', chunk => { stdout += chunk.toString() })
    py.stderr.on('data', chunk => { stderr += chunk.toString() })

    py.on('error', spawnErr => {
      console.error('python3 spawn error', spawnErr)
      res.status(500).json({ error: 'cannot start python3' })
    })

    py.on('close', code => {
      // clean up the uploaded file
      fs.unlink(filePath).catch(() => {})
      if (code !== 0) {
        console.error('python exited nonzero', code, stderr)
        return res.status(500).json({ error: 'inference failed', details: stderr })
      }

      try {
        const out = JSON.parse(stdout)
        return res.status(200).json(out)
      } catch (e) {
        console.error('invalid JSON from python', stdout)
        return res.status(500).json({ error: 'bad JSON', raw: stdout })
      }
    })
  })
}
