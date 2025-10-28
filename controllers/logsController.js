const LogsController = {
    uploadLogs: async (req, res) => {
        const { deviceId, timestamp, logs } = req.body;
        const date = timestamp.split("T")[0];
        const dir = path.join(__dirname, "server_logs", date, deviceId);
        fs.mkdirSync(dir, { recursive: true });

        const file = path.join(dir, `${Date.now()}.jsonl`);
        const lines = logs.map(l => JSON.stringify(l)).join("\n") + "\n";
        fs.appendFileSync(file, lines);

        res.sendStatus(200);
    },
};

module.exports = LogsController;
