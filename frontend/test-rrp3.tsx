import React from 'react';
import { renderToString } from 'react-dom/server';
import { Group, Panel, Separator } from 'react-resizable-panels';

const App = () => (
  <Group orientation="vertical">
    <Panel id="p1" defaultSize={50}>P1</Panel>
    <Separator />
    <Panel id="p2" defaultSize={50}>P2</Panel>
  </Group>
);
console.log(renderToString(<App />));
