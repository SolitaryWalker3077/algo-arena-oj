package com.oj.system.service.exam.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.github.pagehelper.PageHelper;
import com.oj.common.enums.ResultCode;
import com.oj.security.expection.ServiceException;
import com.oj.system.entity.exam.ExamInfo;
import com.oj.system.entity.exam.dto.ExamAddDto;
import com.oj.system.entity.exam.dto.ExamQueryDto;
import com.oj.system.entity.exam.vo.ExamVO;
import com.oj.system.entity.question.QuestionsInfo;
import com.oj.system.mapper.exam.ExamMapper;
import com.oj.system.service.exam.IExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ExamService implements IExamService {

    @Autowired
    private ExamMapper examMapper;

    @Override
    public List<ExamVO> list(ExamQueryDto examQueryDto) {
        PageHelper.startPage(examQueryDto.getPageNum(),examQueryDto.getPageSize());
        return examMapper.selectExamList(examQueryDto);
    }

    @Override
    public int add(ExamAddDto examAddDto) {
        List<ExamInfo> examInfos = examMapper.selectList(new LambdaQueryWrapper<ExamInfo>()
                .eq(ExamInfo::getTitle, examAddDto.getTitle()));

        if (CollectionUtil.isNotEmpty(examInfos)) {
            throw new ServiceException(ResultCode.FAILED_ALREADY_EXISTS);
        }
        if(examAddDto.getStartTime().isBefore(LocalDateTime.now())) {
            throw new ServiceException(ResultCode.EXAM_START_TIME_BEFORE_CURRENT_TIME);
        }

        if(examAddDto.getStartTime().isAfter(examAddDto.getEndTime())) {
            throw new ServiceException(ResultCode.EXAM_START_TIME_AFTER_END_TIME);
        }

        ExamInfo exam = new ExamInfo();
         BeanUtil.copyProperties(examAddDto,exam);
         return examMapper.insert(exam);
    }
}
