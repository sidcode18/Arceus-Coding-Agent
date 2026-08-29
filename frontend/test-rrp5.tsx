import React from 'react';
import { renderToString } from 'react-dom/server';
import { Group, Panel, Separator } from 'react-resizable-panels';

const App = () => (
  <Group orientation="horizontal">
    <Panel id="p1" defaultSize={50} style={{ minWidth: 260 }}>P1</Panel>
  </Group>
);
console.log(renderToString(<App />));
