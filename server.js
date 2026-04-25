const express = require('express');
const path = require('path');

const app = express();
const staticRoot = path.join(__dirname, 'files (15)');

app.use(
  express.static(staticRoot, {
    index: 'index.html',
    extensions: ['html']
  })
);

app.get('*', (req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'), (err) => {
    if (err) res.status(404).send('Not found');
  });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`PennyPal static server listening on 0.0.0.0:${port}`);
});
