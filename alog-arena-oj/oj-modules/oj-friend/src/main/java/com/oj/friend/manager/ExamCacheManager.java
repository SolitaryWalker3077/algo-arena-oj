package com.oj.friend.manager;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.github.pagehelper.PageHelper;
import com.oj.common.constants.CacheConstants;
import com.oj.common.constants.Constants;
import com.oj.common.enums.ExamListType;
import com.oj.friend.entity.exam.ExamInfo;
import com.oj.friend.entity.exam.dto.ExamQueryDto;
import com.oj.friend.entity.exam.vo.ExamVo;
import com.oj.friend.mapper.exam.ExamMapper;
import com.oj.redis.service.RedisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class ExamCacheManager {

    @Autowired
    private ExamMapper examMapper;

    @Autowired
    private RedisService redisService;

    /**
     * 获取指定类型的竞赛列表缓存数量。
     *
     * @param examListType 竞赛列表类型
     * @return 缓存中的竞赛数量
     */
    public Long getListSize(Integer examListType) {
        String examListKey = getExamListKey(examListType);
        return redisService.getListSize(examListKey);
    }

    /**
     * 分页获取竞赛列表，优先从 Redis 读取；缓存缺失或数据不完整时回源数据库并刷新缓存。
     *
     * @param examQueryDTO 竞赛列表查询条件
     * @return 当前页竞赛列表
     */
    public List<ExamVo> getExamVOList(ExamQueryDto examQueryDTO) {
        int start = (examQueryDTO.getPageNum() - 1) * examQueryDTO.getPageSize();
        int end = start + examQueryDTO.getPageSize() - 1; //下标需要 -1
        String examListKey = getExamListKey(examQueryDTO.getType());
        List<Long> examIdList = redisService.getCacheListByRange(examListKey, start, end, Long.class);
        List<ExamVo> examVOList = assembleExamVOList(examIdList);
        if (CollectionUtil.isEmpty(examVOList)) {
            //说明redis中数据可能有问题 从数据库中查数据并且重新刷新缓存
            examVOList = getExamListByDB(examQueryDTO); //从数据库中获取数据
            refreshCache(examQueryDTO.getType());
        }
        return examVOList;
    }

    /**
     * 根据竞赛列表类型从数据库加载有效竞赛，并重建列表缓存和详情缓存。
     *
     * @param examListType 竞赛列表类型
     */
    public void refreshCache(Integer examListType) {
        List<ExamInfo> examList = new ArrayList<>();
        if (ExamListType.EXAM_UN_FINISH_LIST.getValue().equals(examListType)) {
            //查询未完赛的竞赛列表
            examList = examMapper.selectList(new LambdaQueryWrapper<ExamInfo>()
                    .select(ExamInfo::getExamId, ExamInfo::getTitle, ExamInfo::getStartTime, ExamInfo::getEndTime)
                    .gt(ExamInfo::getEndTime, LocalDateTime.now())
                    .eq(ExamInfo::getStatus, Constants.TRUE)
                    .orderByDesc(ExamInfo::getCreateTime));
        } else if (ExamListType.EXAM_HISTORY_LIST.getValue().equals(examListType)) {
            //查询历史竞赛
            examList = examMapper.selectList(new LambdaQueryWrapper<ExamInfo>()
                    .select(ExamInfo::getExamId, ExamInfo::getTitle, ExamInfo::getStartTime, ExamInfo::getEndTime)
                    .le(ExamInfo::getEndTime, LocalDateTime.now())
                    .eq(ExamInfo::getStatus, Constants.TRUE)
                    .orderByDesc(ExamInfo::getCreateTime));
        }
        if (CollectionUtil.isEmpty(examList)) {
            return;
        }

        Map<String, ExamInfo> examMap = new HashMap<>();
        List<Long> examIdList = new ArrayList<>();
        for (ExamInfo exam : examList) {
            examMap.put(getDetailKey(exam.getExamId()), exam);
            examIdList.add(exam.getExamId());
        }
        redisService.multiSet(examMap);  //刷新详情缓存
        redisService.deleteObject(getExamListKey(examListType));
        redisService.rightPushAll(getExamListKey(examListType), examIdList);      //刷新列表缓存
    }

    /**
     * 按查询条件从数据库分页查询竞赛列表。
     *
     * @param examQueryDTO 竞赛列表查询条件
     * @return 当前页竞赛列表
     */
    private List<ExamVo> getExamListByDB(ExamQueryDto examQueryDTO) {
        PageHelper.startPage(examQueryDTO.getPageNum(), examQueryDTO.getPageSize());
        return examMapper.selectExamList(examQueryDTO);
    }

    /**
     * 根据竞赛 ID 列表批量读取详情缓存，并校验详情数量是否完整。
     *
     * @param examIdList 竞赛 ID 列表
     * @return 完整的竞赛详情列表；缓存缺失或不完整时返回 {@code null}
     */
    private List<ExamVo> assembleExamVOList(List<Long> examIdList) {
        if (CollectionUtil.isEmpty(examIdList)) {
            //说明redis当中没数据 从数据库中查数据并且重新刷新缓存
            return null;
        }
        //拼接redis当中key的方法 并且将拼接好的key存储到一个list中
        List<String> detailKeyList = new ArrayList<>();
        for (Long examId : examIdList) {
            detailKeyList.add(getDetailKey(examId));
        }
        List<ExamVo> examVOList = redisService.multiGet(detailKeyList, ExamVo.class);
        CollUtil.removeNull(examVOList);
        if (CollectionUtil.isEmpty(examVOList) || examVOList.size() != examIdList.size()) {
            //说明redis中数据有问题 从数据库中查数据并且重新刷新缓存
            return null;
        }
        return examVOList;
    }

    /**
     * 根据竞赛列表类型获取对应的 Redis 列表键。
     *
     * @param examListType 竞赛列表类型
     * @return Redis 列表键；类型不受支持时返回空字符串
     */
    private String getExamListKey(Integer examListType) {
        if (ExamListType.EXAM_UN_FINISH_LIST.getValue().equals(examListType)) {
            return CacheConstants.EXAM_UNFINISHED_LIST;
        } else if (ExamListType.EXAM_HISTORY_LIST.getValue().equals(examListType)) {
            return CacheConstants.EXAM_HISTORY_LIST;
        }
        return "";
    }

    /**
     * 生成指定竞赛的详情缓存键。
     *
     * @param examId 竞赛 ID
     * @return Redis 详情键
     */
    private String getDetailKey(Long examId) {
        return CacheConstants.EXAM_DETAIL + examId;
    }
}
