package com.oj.friend.service.exam.impl;

import cn.hutool.core.collection.CollectionUtil;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import com.oj.common.constants.Constants;
import com.oj.common.entity.TableDataInfo;
import com.oj.friend.entity.exam.dto.ExamQueryDto;
import com.oj.friend.entity.exam.vo.ExamVo;
import com.oj.friend.manager.ExamCacheManager;
import com.oj.friend.mapper.exam.ExamMapper;
import com.oj.friend.service.exam.IExamService;
import com.oj.security.utils.ThreadLocalUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


import java.util.Collection;
import java.util.List;

@Service
public class ExamServiceImpl implements IExamService {

    @Autowired
    private ExamMapper examMapper;

    @Autowired
    private ExamCacheManager examCacheManager;


    @Override
    public List<ExamVo> list(ExamQueryDto examQueryDto) {
        PageHelper.startPage(examQueryDto.getPageNum(), examQueryDto.getPageSize());
        return examMapper.selectExamList(examQueryDto);
    }

    @Override
    public TableDataInfo redisList(ExamQueryDto examQueryDto) {
        //从redis当中获取 竞赛列表的数据
        Long total = examCacheManager.getListSize(examQueryDto.getType(),null);
        List<ExamVo> examVoList;
        if (total == null || total <= 0) {
            examVoList = list(examQueryDto);
            examCacheManager.refreshCache(examQueryDto.getType(),null);
            total = new PageInfo<>(examVoList).getTotal();
        } else {
            examVoList = examCacheManager.getExamVOList(examQueryDto,null);
            total = examCacheManager.getListSize(examQueryDto.getType(),null);
        }
        if (CollectionUtil.isEmpty(examVoList)) {
            return TableDataInfo.empty();
        }
        assembleExamVoList(examVoList);
        return TableDataInfo.success(examVoList,total);
    }

    private void assembleExamVoList(List<ExamVo> examVoList) {
        Long userId = ThreadLocalUtil.get(Constants.USER_ID, Long.class);
        List<Long> userExamIdList = examCacheManager.getAllUserExamList(userId);
        if (CollectionUtil.isEmpty(userExamIdList)) {
            return;
        }
        for (ExamVo examVo : examVoList) {
            if (userExamIdList.contains(examVo.getExamId())) {
                examVo.setEnter(true);
            }
        }
    }
}
