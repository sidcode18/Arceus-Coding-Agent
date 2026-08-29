import React from 'react';
import { renderToString } from 'react-dom/server';
import { Group, Panel, Separator } from 'react-resizable-panels';

const App = () => (
  <Group orientation="horizontal" className="my-group">
    <Panel id="p1" defaultSize={50} className="my-panel-1">P1</Panel>
    <Separator className="my-separator" />
    <Panel id="p2" defaultSize={50} className="my-panel-2">P2</Panel>
  </Group>
);
console.log(renderToString(<App />));
