package com.oj.system.service.exam.impl;

import com.github.pagehelper.PageHelper;
import com.oj.system.entity.exam.dto.ExamQueryDto;
import com.oj.system.entity.exam.vo.ExamVO;
import com.oj.system.mapper.exam.ExamMapper;
import com.oj.system.service.exam.IExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
}
