# 快递公司异常处理系统 (Express Exception Handling) - 统一领域语言词汇表 (Glossary)

为了保证前后端开发、数据库设计与文档中的术语一致，本项目所有代码、表名、变量与接口必须统一遵守以下命名约定：

| 中文领域概念 | 统一英文标识符 (Entity/Enum) | 对应数据库/代码命名 | 业务含义与边界定义 |
| :--- | :--- | :--- | :--- |
| **客户** | `Customer` | `customers`, `customerId` | 运单所属人，可查询本人运单、提交异常反馈、查看公开进度并确认结果。 |
| **客服** | `CustomerService` | `customer_services`, `csId` | 负责创建、分类、分派异常工单，确认对外说明并反馈客户。 |
| **运营人员** | `OperationsStaff` | `operations_staff`, `opsId` | 负责受理被分派工单、记录内部核实过程、提交处理方案与结果。 |
| **运单** | `Waybill` | `waybills`, `waybillId` | 模拟快递运单主数据，包含运单号、客户、收发件人及状态。统一用 Waybill，不用 Order/Shipment。 |
| **运单号** | `WaybillNo` | `waybill_no` | 运单的业务唯一编号，用于客户查询。 |
| **运输节点** | `TransportNode` | `transport_nodes`, `nodeId` | 物流轨迹中的关键节点（揽收、中转、到达、派送、签收）。 |
| **节点类型** | `NodeType` | `node_type` | 运输节点枚举：PICKUP / TRANSIT / ARRIVAL / DELIVERY / SIGNED。 |
| **轨迹记录** | `TrackRecord` | `track_records`, `trackId` | 面向客户展示的物流轨迹记录，按 occurredAt 升序展示。 |
| **异常反馈** | `ExceptionFeedback` | `exception_feedbacks`, `feedbackId` | 客户提交的异常描述实体，初始状态为 PENDING_ACCEPT。 |
| **异常类型** | `ExceptionType` | `exception_type` | 异常枚举：DELAY / DAMAGE / LABEL_DAMAGED / CONTACT_ABNORMAL / SIGN_DISPUTE。 |
| **异常工单** | `ExceptionTicket` | `exception_tickets`, `ticketId` | 内部处理异常的单据实体，统一用 Ticket，不用 Case/Issue。 |
| **工单号** | `TicketNo` | `ticket_no` | 工单的业务唯一编号，全局唯一。 |
| **工单状态** | `TicketStatus` | `ticket_status` | 工单状态枚举：PENDING / PROCESSING / PENDING_CS_CONFIRM / PENDING_CUSTOMER_CONFIRM / CLOSED。 |
| **待处理** | `PENDING` | `status = 'PENDING'` | 工单已创建或客户不认可后重新打开，等待运营受理。 |
| **处理中** | `PROCESSING` | `status = 'PROCESSING'` | 运营已受理，正在核实与处理。 |
| **待客服确认** | `PENDING_CS_CONFIRM` | `status = 'PENDING_CS_CONFIRM'` | 运营已提交处理结果，等待客服确认对外说明。 |
| **待客户确认** | `PENDING_CUSTOMER_CONFIRM` | `status = 'PENDING_CUSTOMER_CONFIRM'` | 客服已生成对外反馈，等待客户确认或拒绝。 |
| **已关闭** | `CLOSED` | `status = 'CLOSED'` | 客户已确认处理结果，工单终结状态，不可重复关闭。 |
| **工单沟通** | `TicketCommunication` | `ticket_communications`, `communicationId` | 客户、客服、运营在工单下的沟通记录，含可见性字段。 |
| **可见性** | `Visibility` | `visibility` | 记录可见性枚举：CUSTOMER_VISIBLE / INTERNAL_ONLY。 |
| **客户可见** | `CUSTOMER_VISIBLE` | `visibility = 'CUSTOMER_VISIBLE'` | 客户可查看的沟通或说明记录。 |
| **仅内部可见** | `INTERNAL_ONLY` | `visibility = 'INTERNAL_ONLY'` | 仅客服与运营可见，客户接口不得返回。 |
| **内部处理记录** | `InternalHandlingRecord` | `internal_handling_records`, `recordId` | 运营填写的核实过程与处理方案，默认 INTERNAL_ONLY。 |
| **对外反馈记录** | `CustomerFeedbackRecord` | `customer_feedback_records`, `feedbackRecordId` | 客服确认后对客户公开的说明，默认 CUSTOMER_VISIBLE。 |
| **状态变更日志** | `TicketStatusLog` | `ticket_status_logs`, `logId` | 记录工单状态变更的 fromStatus、toStatus、操作人、原因、时间。 |
| **处理期限** | `DeadlineAt` | `deadline_at` | 工单必须处理完成的时间点，按异常类型 SLA 计算。 |
| **预警时间** | `WarningAt` | `warning_at` | 即将超时的起始时间点，通常为 deadlineAt 前若干小时。 |
| **超时状态** | `TimeoutStatus` | `timeout_status` | 超时枚举：NORMAL / WARNING / OVERDUE。 |
| **正常** | `NORMAL` | `timeout_status = 'NORMAL'` | 当前时间早于 warningAt。 |
| **即将超时** | `WARNING` | `timeout_status = 'WARNING'` | 当前时间已到 warningAt 且未到 deadlineAt。 |
| **已超时** | `OVERDUE` | `timeout_status = 'OVERDUE'` | 当前时间已超过 deadlineAt。 |
| **被分派人员** | `Assignee` | `assignee_id` | 工单被分派到的运营人员，只有该人员可受理与提交处理结果。 |
| **负责客服** | `Handler` | `handler_id` | 负责该工单的客服人员。 |
| **重新打开** | `Reopen` | `reopen` | 客户不认可处理结果后，工单从 PENDING_CUSTOMER_CONFIRM 回到 PENDING，保留原记录。 |
| **确认结果** | `Confirm` | `confirm` | 客户确认处理结果，工单状态变为 CLOSED。 |
| **不认可** | `Reject` | `reject` | 客户拒绝处理结果并申请继续处理，工单重新打开。 |
| **SLA 配置** | `SlaConfig` | `sla_configs`, `slaId` | 按异常类型配置处理期限与预警时间的配置实体。 |
| **优先级** | `Priority` | `priority` | 工单优先级枚举：LOW / MEDIUM / HIGH / URGENT。 |
