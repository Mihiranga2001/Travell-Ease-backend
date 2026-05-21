import Connection from "../models/Connection.js"

export function getConnections(req, res) {

  Connection.find().then((connections) => {
      res.json(connections);
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to fetch connections"
      });
    });
}

export function createConnection(req, res) {

  const connection = new Connection(req.body);

  connection.save().then(() => {
      res.json({
        message: "Connection request sent"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to send connection request"
      });
    });
}

export function updateConnection(req, res) {

  const connectionId = req.params.id;

  Connection.findByIdAndUpdate(connectionId, req.body).then(() => {
      res.json({
        message: "Connection updated successfully"
      });
    })
    .catch(() => {
      res.status(500).json({
        message: "Failed to update connection"
      });
    });
}