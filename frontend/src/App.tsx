import { useState } from "react";
import "./App.css";
import HeatMap, { type DataPoint } from "./HeatMap";
import axios from "axios";

function App() {
  const [ohtani, setOhtani] = useState<DataPoint[] | null>(null);
  const [rizzo, setRizzo] = useState<DataPoint[] | null>(null);
  const [russell, setRussell] = useState<DataPoint[] | null>(null);

  const getPlayer = async (last: string, first: string) => {
    const res = await axios.get(`http://localhost:8000/avg?last=${last}&first=${first}`);
    const probGrid = res.data.probGrid;
    if (last === "ohtani") {
      setOhtani(probGrid);
    } else if (last === "rizzo") {
      setRizzo(probGrid);
    } else if (last === "russell") {
      setRussell(probGrid);
    }
    return;
  };

  return (
    <div>
      <button onClick={() => getPlayer("ohtani", "shohei")}>ohtani</button>
      <button onClick={() => getPlayer("rizzo", "anthony")}>rizzo</button>
      <button onClick={() => getPlayer("russell", "addison")}>russell</button>
      <HeatMap data={ohtani} />
      <HeatMap data={rizzo} />
      <HeatMap data={russell} />
    </div>
  );
}

export default App;
