export default function handler(req, res) {
    res.status(200).json({ status: 'Alive', message: 'API is working' });
}
