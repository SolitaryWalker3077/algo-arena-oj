package com.oj.friend.service.exam;

import com.oj.friend.entity.exam.dto.ExamQueryDto;
import com.oj.friend.entity.exam.vo.ExamVo;

import java.util.List;

public interface IExamService {

    List<ExamVo> list(ExamQueryDto examQueryDto);
}
