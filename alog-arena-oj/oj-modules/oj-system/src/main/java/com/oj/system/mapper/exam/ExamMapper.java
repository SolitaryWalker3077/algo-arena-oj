package com.oj.system.mapper.exam;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.system.entity.exam.ExamInfo;
import com.oj.system.entity.exam.dto.ExamQueryDto;
import com.oj.system.entity.exam.vo.ExamVo;

import java.util.List;

public interface ExamMapper extends BaseMapper<ExamInfo> {
    List<ExamVo> selectExamList(ExamQueryDto examQueryDto);
}
