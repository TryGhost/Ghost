import '@xyflow/react/dist/style.css';
import AddStepNode from './add-step-node';
import CampaignStepNode from './campaign-step-node';
import DelayEdge from './delay-edge';
import React from 'react';
import TriggerNode from './trigger-node';
import {EDGE_TYPE_DELAY, NODE_TYPE_ADD, NODE_TYPE_STEP, NODE_TYPE_TRIGGER} from './flow-types';
import {ReactFlow} from '@xyflow/react';
import {useCampaignFlow} from './use-campaign-flow';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

const nodeTypes = {
    [NODE_TYPE_TRIGGER]: TriggerNode,
    [NODE_TYPE_STEP]: CampaignStepNode,
    [NODE_TYPE_ADD]: AddStepNode
};

const edgeTypes = {
    [EDGE_TYPE_DELAY]: DelayEdge
};

const FLOW_STYLES = `
.campaign-flow .react-flow__pane { pointer-events: none; }
.campaign-flow .react-flow__attribution { display: none; }
.campaign-flow .react-flow__node { border: none !important; padding: 0 !important; }
.campaign-flow .react-flow__node.selected { box-shadow: none !important; }
`;

interface CampaignFlowProps {
    campaignType: string;
    emails: AutomatedEmail[];
}

const CampaignFlow: React.FC<CampaignFlowProps> = ({campaignType, emails}) => {
    const {nodes, edges, onNodeDragStop, onNodeDrag, containerHeight} = useCampaignFlow(campaignType, emails);

    return (
        <div className='campaign-flow mt-1' style={{height: containerHeight}}>
            <style>{FLOW_STYLES}</style>
            <ReactFlow
                edges={edges}
                edgeTypes={edgeTypes}
                nodes={nodes}
                nodesConnectable={false}
                nodeTypes={nodeTypes}
                panOnDrag={false}
                panOnScroll={false}
                zoomOnDoubleClick={false}
                zoomOnPinch={false}
                zoomOnScroll={false}
                fitView
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
            >
            </ReactFlow>
        </div>
    );
};

export default CampaignFlow;
