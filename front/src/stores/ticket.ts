/**
 * @file stores/ticket.ts
 * 文件作用：工单 Store（useTicketStore），服务三种视角：
 * - 客户：工单列表 / 公开进度 / 确认结果 / 申请继续处理
 * - 客服：工单列表 / 详情（含内部记录）/ 创建 / 分派 / 对外说明 / 关闭
 * - 运营：待办列表 / 详情 / 受理 / 内部核实 / 提交处理结果
 *
 * 同时维护列表筛选状态（按 TicketStatus），并对写操作提供独立的 submitting
 * 标记，供按钮禁用防重复提交。
 */
import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  acceptTicket,
  assignTicket,
  closeTicket,
  confirmCustomerFeedback,
  confirmTicket,
  createInternalRecord,
  createTicket,
  getCsTicketDetail,
  getCsTickets,
  getCustomerTicketDetail,
  getMyTickets,
  getOpsTicketDetail,
  getOpsTickets,
  rejectTicket,
  submitHandlingResult,
} from '@/api/workorder';
import type {
  AssignTicketRequest,
  ConfirmCustomerFeedbackRequest,
  CreateInternalRecordRequest,
  CreateTicketRequest,
  CursorPageRequest,
  CursorPageResponse,
  CustomerTicket,
  InternalTicket,
  RejectTicketRequest,
  SubmitHandlingResultRequest,
  TicketStatus,
} from '@/api/api-contracts';

/** 列表筛选：全部 / 指定工单状态 */
export type TicketStatusFilter = TicketStatus | 'ALL';

function pickMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const useTicketStore = defineStore('ticket', () => {
  /* ------------------------------- state ------------------------------- */

  /** 三视角各自的游标分页数据 */
  const customerPage = ref<CursorPageResponse<CustomerTicket> | null>(null);
  const csPage = ref<CursorPageResponse<InternalTicket> | null>(null);
  const opsPage = ref<CursorPageResponse<InternalTicket> | null>(null);

  /** 当前查看的工单（客户视角 / 内部视角严格分离，禁止混用渲染） */
  const currentCustomerTicket = ref<CustomerTicket | null>(null);
  const currentInternalTicket = ref<InternalTicket | null>(null);

  /** 列表筛选状态 */
  const statusFilter = ref<TicketStatusFilter>('ALL');

  /** 加载标记：列表 ×3、详情 ×2 */
  const loading = reactive({
    customerList: false,
    csList: false,
    opsList: false,
    customerDetail: false,
    internalDetail: false,
  });
  /** 写操作提交中标记（确认 / 关闭 / 受理等防重复点击） */
  const submitting = ref(false);
  /** 最近一次错误信息 */
  const error = ref<string | null>(null);

  /* ------------------------------ getters ------------------------------ */

  /**
   * 按当前 statusFilter 过滤后的客户工单列表
   * 注意：仅用于前端展示过滤；后端分页与该过滤相互独立。
   */
  const customerTickets = computed<CustomerTicket[]>(() => {
    const items = customerPage.value?.items ?? [];
    return statusFilter.value === 'ALL'
      ? items
      : items.filter((t) => t.status === statusFilter.value);
  });
  const csTickets = computed<InternalTicket[]>(() => {
    const items = csPage.value?.items ?? [];
    return statusFilter.value === 'ALL'
      ? items
      : items.filter((t) => t.status === statusFilter.value);
  });
  const opsTickets = computed<InternalTicket[]>(() => {
    const items = opsPage.value?.items ?? [];
    return statusFilter.value === 'ALL'
      ? items
      : items.filter((t) => t.status === statusFilter.value);
  });

  const isCustomerListEmpty = computed(
    () => !loading.customerList && customerTickets.value.length === 0,
  );
  const isCsListEmpty = computed(() => !loading.csList && csTickets.value.length === 0);
  const isOpsListEmpty = computed(() => !loading.opsList && opsTickets.value.length === 0);

  /* ------------------------------ actions ------------------------------ */

  /** 设置状态筛选（页面切换下拉时调用） */
  function setStatusFilter(status: TicketStatusFilter): void {
    statusFilter.value = status;
  }

  /**
   * 统一包装写操作：进入 submitting、结束释放；
   * 页面据此禁用按钮并显示加载态，防止重复提交。
   */
  async function withSubmitting<T>(action: () => Promise<T>): Promise<T> {
    submitting.value = true;
    error.value = null;
    try {
      return await action();
    } catch (err) {
      error.value = pickMessage(err, '操作失败');
      throw err;
    } finally {
      submitting.value = false;
    }
  }

  /* ---- 客户视角 ---- */

  /**
   * 查询客户工单列表
   * @param params 游标分页参数
   * @param append true 表示“加载更多”，将新页 items 追加到已有列表
   */
  async function fetchCustomerTickets(params?: CursorPageRequest, append = false): Promise<void> {
    loading.customerList = true;
    error.value = null;
    try {
      const page = await getMyTickets(params);
      customerPage.value = append
        ? { ...page, items: [...(customerPage.value?.items ?? []), ...page.items] }
        : page;
    } catch (err) {
      error.value = pickMessage(err, '工单列表加载失败');
      throw err;
    } finally {
      loading.customerList = false;
    }
  }

  async function fetchCustomerTicketDetail(id: number): Promise<void> {
    loading.customerDetail = true;
    error.value = null;
    try {
      currentCustomerTicket.value = await getCustomerTicketDetail(id);
    } catch (err) {
      error.value = pickMessage(err, '工单详情加载失败');
      throw err;
    } finally {
      loading.customerDetail = false;
    }
  }

  /** 客户确认处理结果（工单须为 PENDING_CUSTOMER_CONFIRM），remark 存为客户可见沟通记录 */
  function confirmCustomerTicket(id: number, remark?: string): Promise<void> {
    return withSubmitting(() => confirmTicket(id, remark));
  }

  /** 客户不认可、申请继续处理（工单须为 PENDING_CUSTOMER_CONFIRM） */
  function rejectCustomerTicket(data: RejectTicketRequest): Promise<void> {
    return withSubmitting(() => rejectTicket(data));
  }

  /* ---- 客服视角 ---- */

  /** 查询客服工单列表（append=true 为加载更多） */
  async function fetchCsTickets(params?: CursorPageRequest, append = false): Promise<void> {
    loading.csList = true;
    error.value = null;
    try {
      const page = await getCsTickets(params);
      csPage.value = append
        ? { ...page, items: [...(csPage.value?.items ?? []), ...page.items] }
        : page;
    } catch (err) {
      error.value = pickMessage(err, '工单列表加载失败');
      throw err;
    } finally {
      loading.csList = false;
    }
  }

  async function fetchCsTicketDetail(id: number): Promise<void> {
    loading.internalDetail = true;
    error.value = null;
    try {
      currentInternalTicket.value = await getCsTicketDetail(id);
    } catch (err) {
      error.value = pickMessage(err, '工单详情加载失败');
      throw err;
    } finally {
      loading.internalDetail = false;
    }
  }

  /** 创建工单，返回新工单 id */
  function createCsTicket(data: CreateTicketRequest): Promise<number> {
    return withSubmitting(() => createTicket(data));
  }

  /** 分派工单给运营 */
  function assignCsTicket(data: AssignTicketRequest): Promise<void> {
    return withSubmitting(() => assignTicket(data));
  }

  /** 客服确认对外说明（工单须为 PENDING_CS_CONFIRM） */
  function confirmCsCustomerFeedback(data: ConfirmCustomerFeedbackRequest): Promise<void> {
    return withSubmitting(() => confirmCustomerFeedback(data));
  }

  /** 关闭工单（已关闭重复关闭返回 40900） */
  function closeCsTicket(id: number): Promise<void> {
    return withSubmitting(() => closeTicket(id));
  }

  /* ---- 运营视角 ---- */

  /** 查询运营待办工单（append=true 为加载更多） */
  async function fetchOpsTickets(params?: CursorPageRequest, append = false): Promise<void> {
    loading.opsList = true;
    error.value = null;
    try {
      const page = await getOpsTickets(params);
      opsPage.value = append
        ? { ...page, items: [...(opsPage.value?.items ?? []), ...page.items] }
        : page;
    } catch (err) {
      error.value = pickMessage(err, '待办工单加载失败');
      throw err;
    } finally {
      loading.opsList = false;
    }
  }

  async function fetchOpsTicketDetail(id: number): Promise<void> {
    loading.internalDetail = true;
    error.value = null;
    try {
      currentInternalTicket.value = await getOpsTicketDetail(id);
    } catch (err) {
      error.value = pickMessage(err, '工单详情加载失败');
      throw err;
    } finally {
      loading.internalDetail = false;
    }
  }

  /** 受理工单（仅被分派运营，工单须为 PENDING） */
  function acceptOpsTicket(id: number): Promise<void> {
    return withSubmitting(() => acceptTicket(id));
  }

  /** 记录内部核实过程（INTERNAL_ONLY），返回新记录 id */
  function createOpsInternalRecord(data: CreateInternalRecordRequest): Promise<number> {
    return withSubmitting(() => createInternalRecord(data));
  }

  /** 提交处理结果（工单须为 PROCESSING，提交后变 PENDING_CS_CONFIRM） */
  function submitOpsHandlingResult(data: SubmitHandlingResultRequest): Promise<void> {
    return withSubmitting(() => submitHandlingResult(data));
  }

  /** 重置当前工单（离开详情页时调用，防止跨工单数据闪现） */
  function resetCurrent(): void {
    currentCustomerTicket.value = null;
    currentInternalTicket.value = null;
    error.value = null;
  }

  return {
    // state
    customerPage,
    csPage,
    opsPage,
    currentCustomerTicket,
    currentInternalTicket,
    statusFilter,
    loading,
    submitting,
    error,
    // getters
    customerTickets,
    csTickets,
    opsTickets,
    isCustomerListEmpty,
    isCsListEmpty,
    isOpsListEmpty,
    // actions
    setStatusFilter,
    fetchCustomerTickets,
    fetchCustomerTicketDetail,
    confirmCustomerTicket,
    rejectCustomerTicket,
    fetchCsTickets,
    fetchCsTicketDetail,
    createCsTicket,
    assignCsTicket,
    confirmCsCustomerFeedback,
    closeCsTicket,
    fetchOpsTickets,
    fetchOpsTicketDetail,
    acceptOpsTicket,
    createOpsInternalRecord,
    submitOpsHandlingResult,
    resetCurrent,
  };
});
