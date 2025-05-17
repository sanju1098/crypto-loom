import React, { useEffect, useState, useRef } from "react";
import "./CryptoLoom.css";

interface TickerData {
	symbol: string;
	price: number;
	time: number;
	volume: number;
	change: number;
}

const CryptoLoom: React.FC = () => {
	const [tickers, setTickers] = useState<Record<string, TickerData[]>>({});
	const [viewMode, setViewMode] = useState<"card" | "table">("card");
	const [isConnected, setIsConnected] = useState<boolean>(false);
	const [displayCount, setDisplayCount] = useState<number>(10);
	const [filter, setFilter] = useState<"all" | "profits" | "loss">("all");

	const ws = useRef<WebSocket | null>(null);

	const connect = () => {
		if (ws.current) return;
		ws.current = new WebSocket(
			"wss://stream.binance.com:9443/ws/!miniTicker@arr"
		);

		ws.current.onopen = () => setIsConnected(true);
		ws.current.onclose = () => {
			setIsConnected(false);
			ws.current = null;
		};

		ws.current.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (Array.isArray(data)) {
				const updates: Record<string, TickerData[]> = {};

				data.forEach((item: any) => {
					const symbol = item.s.toLowerCase();
					const price = parseFloat(item.c);
					const volume = parseFloat(item.v);
					const open = parseFloat(item.o);
					const change = ((price - open) / open) * 100;

					updates[symbol] = [
						...(tickers[symbol] || []).slice(-49),
						{
							symbol,
							price,
							volume,
							time: Date.now(),
							change,
						},
					];
				});

				setTickers((prev) => ({ ...prev, ...updates }));
			}
		};
	};

	const disconnect = () => {
		ws.current?.close();
		ws.current = null;
		setIsConnected(false);
	};

	useEffect(() => {
		connect();
		return () => disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const toggleView = () =>
		setViewMode((prev) => (prev === "card" ? "table" : "card"));

	const toggleConnection = () => {
		isConnected ? disconnect() : connect();
	};

	const getTopTickers = () => {
		const entries = Object.entries(tickers);

		const filtered = entries.filter(([, data]) => {
			const latest = data[data.length - 1];
			if (!latest) return false;

			if (filter === "profits") return latest.change > 0;
			if (filter === "loss") return latest.change < 0;
			return true;
		});

		const sorted = filtered.sort(([, dataA], [, dataB]) => {
			const latestA = dataA[dataA.length - 1];
			const latestB = dataB[dataB.length - 1];
			return latestB.price - latestA.price;
		});

		return sorted.slice(0, displayCount);
	};

	const renderCards = () => (
		<div className="card-grid">
			{getTopTickers().map(([symbol, data]) => {
				const latest = data[data.length - 1];
				const changeClass = latest.change >= 0 ? "positive" : "negative";

				return (
					<div className={`card ${changeClass}`} key={symbol}>
						<div className="card-header">
							<span>{symbol.toUpperCase()}</span>
							<span>${latest.price.toFixed(2)}</span>
						</div>
						<div className="card-body">
							<div>Vol: {latest.volume.toFixed(2)}M</div>
							<div className={`change ${changeClass}`}>
								{latest.change.toFixed(2)}%
							</div>
						</div>
						<div className="mini-graph">
							<svg width="100%" height="30">
								<polyline
									fill="none"
									stroke="#00ffcc"
									strokeWidth="2"
									points={data
										.map(
											(d, i) => `${i * 4},${30 - (d.price / latest.price) * 30}`
										)
										.join(" ")}
								/>
							</svg>
						</div>
					</div>
				);
			})}
		</div>
	);

	const renderTable = () => (
		<table className="crypto-table">
			<thead>
				<tr>
					<th>Symbol</th>
					<th>Price</th>
					<th>Volume</th>
					<th>Change</th>
				</tr>
			</thead>
			<tbody>
				{getTopTickers().map(([symbol, data]) => {
					const latest = data[data.length - 1];
					const changeClass = latest.change >= 0 ? "positive" : "negative";
					return (
						<tr key={symbol} className={changeClass}>
							<td>{symbol.toUpperCase()}</td>
							<td>${latest.price.toFixed(2)}</td>
							<td>{latest.volume.toFixed(2)}M</td>
							<td>{latest.change.toFixed(2)}%</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);

	return (
		<div className="crypto-pulse">
			<header>
				<div className="header-left">
					<h1>CryptoLoom</h1>
					<div className={`status ${isConnected ? "" : "disconnected"}`}>
						<div className="dot" />
						{isConnected ? "Connected" : "Disconnected"}
					</div>
				</div>

				<div className="header-right">
					<label htmlFor="displayCount" className="display-label">
						Show:
					</label>
					<div className="display-select-wrapper">
						<select
							id="displayCount"
							value={displayCount}
							onChange={(e) => setDisplayCount(Number(e.target.value))}
							className="display-select"
						>
							{[5, 10, 50, 100].map((num) => (
								<option key={num} value={num}>
									Top {num} stocks
								</option>
							))}
						</select>
					</div>

					<div className="filter-group">
						<button
							className={filter === "all" ? "active" : ""}
							onClick={() => setFilter("all")}
						>
							All
						</button>
						<button
							className={filter === "profits" ? "active" : ""}
							onClick={() => setFilter("profits")}
						>
							Profits
						</button>
						<button
							className={filter === "loss" ? "active" : ""}
							onClick={() => setFilter("loss")}
						>
							Loss
						</button>
					</div>

					<button
						onClick={toggleConnection}
						className={isConnected ? "disconnect" : "connect"}
					>
						{isConnected ? "Disconnect" : "Connect"}
					</button>
					<button onClick={toggleView} className="toggle-view">
						Toggle to {viewMode === "card" ? "Table" : "Card"} View
					</button>
				</div>
			</header>
			{viewMode === "card" ? renderCards() : renderTable()}
		</div>
	);
};

export default CryptoLoom;
