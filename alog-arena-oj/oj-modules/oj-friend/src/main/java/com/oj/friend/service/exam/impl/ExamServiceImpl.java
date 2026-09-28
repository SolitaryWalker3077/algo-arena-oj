package com.oj.friend.service.exam.impl;

import com.github.pagehelper.PageHelper;
import com.oj.friend.entity.exam.dto.ExamQueryDto;
import com.oj.friend.entity.exam.vo.ExamVo;
import com.oj.friend.mapper.exam.ExamMapper;
import com.oj.friend.service.exam.IExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ExamServiceImpl implements IExamService {

    @Autowired
    private ExamMapper examMapper;


    @Override
    public List<ExamVo> list(ExamQueryDto examQueryDto) {
        PageHelper.startPage(examQueryDto.getPageNum(), examQueryDto.getPageSize());
        return examMapper.selectExamList(examQueryDto);
    }
}
